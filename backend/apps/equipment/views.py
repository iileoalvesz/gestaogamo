import os
import tempfile
from datetime import date

from django.db.models import Q
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Equipment, CalibrationCertificate, EquipmentType
from .serializers import (
    EquipmentSerializer,
    EquipmentDetailSerializer,
    CalibrationCertificateSerializer,
    CertificateUploadSerializer,
)
from .pdf_extractor import extract_certificate_data
from apps.accounts.permissions import IsAdminRole


class EquipmentListCreateView(generics.ListCreateAPIView):
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "identification", "serial_number", "location", "model"]
    ordering_fields = ["name", "next_calibration_date", "last_calibration_date", "status"]
    ordering = ["name"]

    def get_queryset(self):
        qs = Equipment.objects.all()
        eq_type = self.request.query_params.get("equipment_type")
        situation = self.request.query_params.get("situation")
        status_filter = self.request.query_params.get("status")

        if eq_type:
            qs = qs.filter(equipment_type=eq_type)
        if situation:
            qs = qs.filter(situation=situation)

        if status_filter:
            today = date.today()
            if status_filter == "em_dia":
                qs = qs.filter(
                    situation="ativo",
                    next_calibration_date__isnull=False,
                    next_calibration_date__gt=today,
                ).exclude(next_calibration_date__lte=today + __import__("datetime").timedelta(days=30))
            elif status_filter == "a_vencer":
                from datetime import timedelta
                qs = qs.filter(
                    situation="ativo",
                    next_calibration_date__isnull=False,
                    next_calibration_date__gte=today,
                    next_calibration_date__lte=today + timedelta(days=30),
                )
            elif status_filter == "vencido":
                qs = qs.filter(situation="ativo", next_calibration_date__lt=today)
            elif status_filter == "sem_data":
                qs = qs.filter(situation="ativo", next_calibration_date__isnull=True)
            elif status_filter in ("danificado", "perdido", "fora_de_uso"):
                qs = qs.filter(situation=status_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EquipmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Equipment.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EquipmentDetailSerializer
        return EquipmentSerializer

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_admin_role:
            return Response(
                {"detail": "Apenas administradores podem excluir equipamentos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class CertificateUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = CertificateUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pdf_file = serializer.validated_data["pdf_file"]
        equipment_id = serializer.validated_data.get("equipment_id")

        # Save to temp file for extraction
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            for chunk in pdf_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            extracted = extract_certificate_data(tmp_path)
        finally:
            os.unlink(tmp_path)

        if "error" in extracted:
            return Response(
                {"detail": f"Falha ao extrair dados do PDF: {extracted['error']}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Try to find or link equipment
        equipment = None
        if equipment_id:
            try:
                equipment = Equipment.objects.get(pk=equipment_id)
            except Equipment.DoesNotExist:
                return Response({"detail": "Equipamento não encontrado."}, status=404)
        else:
            identification = extracted.get("identification", "").strip()
            serial = extracted.get("serial_number", "").strip()
            if identification:
                equipment = Equipment.objects.filter(identification__iexact=identification).first()
            if not equipment and serial:
                equipment = Equipment.objects.filter(serial_number__iexact=serial).first()

        # Reset pdf file pointer for saving
        pdf_file.seek(0)

        cert_data = {
            "certificate_number": extracted.get("certificate_number", ""),
            "issue_date": extracted.get("issue_date"),
            "validity_months": extracted.get("validity_months", 12),
            "requestor": extracted.get("requestor", ""),
            "material_type": extracted.get("material_type", ""),
            "manufacturer": extracted.get("manufacturer", ""),
            "model": extracted.get("model", ""),
            "serial_number": extracted.get("serial_number", ""),
            "identification": extracted.get("identification", ""),
            "measurement_range": extracted.get("measurement_range", ""),
            "resolution": extracted.get("resolution", ""),
            "calibration_status": extracted.get("calibration_status", ""),
            "raw_extracted_text": extracted.get("raw_extracted_text", ""),
        }

        if equipment:
            cert = CalibrationCertificate(equipment=equipment, uploaded_by=request.user, **cert_data)
            cert.pdf_file = pdf_file
            cert.save()

            # Update equipment dates
            if cert.issue_date:
                from datetime import timedelta
                equipment.last_calibration_date = cert.issue_date
                equipment.certificate_number = cert.certificate_number or equipment.certificate_number
                validity_days = (cert.validity_months or 12) * 30
                equipment.next_calibration_date = cert.issue_date + timedelta(days=365)
                equipment.certificate_file = cert.pdf_file
                equipment.save()

            return Response(
                {
                    "extracted": extracted,
                    "certificate": CalibrationCertificateSerializer(cert, context={"request": request}).data,
                    "equipment": EquipmentSerializer(equipment, context={"request": request}).data,
                    "matched": True,
                },
                status=status.HTTP_201_CREATED,
            )

        # No equipment matched — return extracted data for manual association
        return Response(
            {
                "extracted": extracted,
                "certificate": None,
                "equipment": None,
                "matched": False,
                "message": "Equipamento não encontrado automaticamente. Associe manualmente.",
            },
            status=status.HTTP_200_OK,
        )


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta

        today = date.today()
        soon = today + timedelta(days=30)

        all_eq = Equipment.objects.all()
        active = all_eq.filter(situation="ativo")

        em_dia = active.filter(next_calibration_date__isnull=False, next_calibration_date__gt=soon).count()
        a_vencer = active.filter(
            next_calibration_date__isnull=False,
            next_calibration_date__gte=today,
            next_calibration_date__lte=soon,
        ).count()
        vencido = active.filter(next_calibration_date__isnull=False, next_calibration_date__lt=today).count()
        sem_data = active.filter(next_calibration_date__isnull=True).count()
        inativos = all_eq.exclude(situation="ativo").count()

        by_type = {}
        for choice in EquipmentType.choices:
            key = choice[0]
            label = choice[1]
            by_type[key] = {
                "label": label,
                "total": all_eq.filter(equipment_type=key).count(),
                "em_dia": active.filter(equipment_type=key, next_calibration_date__gt=soon).count(),
                "a_vencer": active.filter(
                    equipment_type=key,
                    next_calibration_date__gte=today,
                    next_calibration_date__lte=soon,
                ).count(),
                "vencido": active.filter(equipment_type=key, next_calibration_date__lt=today).count(),
            }

        expiring_soon = list(
            active.filter(
                next_calibration_date__isnull=False,
                next_calibration_date__lte=soon,
            )
            .order_by("next_calibration_date")[:10]
            .values(
                "id", "name", "identification", "equipment_type",
                "location", "next_calibration_date", "situation",
            )
        )
        for item in expiring_soon:
            delta = (item["next_calibration_date"] - today).days
            item["days_until_expiration"] = delta
            item["status"] = "vencido" if delta < 0 else "a_vencer"

        return Response(
            {
                "total": all_eq.count(),
                "em_dia": em_dia,
                "a_vencer": a_vencer,
                "vencido": vencido,
                "sem_data": sem_data,
                "inativos": inativos,
                "by_type": by_type,
                "expiring_soon": expiring_soon,
            }
        )
