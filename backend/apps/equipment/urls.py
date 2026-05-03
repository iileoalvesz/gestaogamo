from django.urls import path
from .views import (
    EquipmentListCreateView,
    EquipmentDetailView,
    CertificateUploadView,
    DashboardView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("equipment/", EquipmentListCreateView.as_view(), name="equipment_list"),
    path("equipment/<int:pk>/", EquipmentDetailView.as_view(), name="equipment_detail"),
    path("certificates/upload/", CertificateUploadView.as_view(), name="certificate_upload"),
]
