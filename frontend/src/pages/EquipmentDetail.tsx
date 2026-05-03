import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CalendarToday as CalIcon,
  DevicesOther as DeviceIcon,
} from "@mui/icons-material";
import { getEquipment } from "../api/equipment";
import type { Equipment, EquipmentStatus } from "../types";

const TYPE_LABELS: Record<string, string> = {
  balanca: "Balança",
  syos: "SYOS",
  logger: "Logger",
  paquimetro: "Paquímetro",
  termometro: "Termômetro",
  outro: "Outro",
};

const SITUATION_LABELS: Record<string, string> = {
  ativo: "Ativo",
  danificado: "Danificado",
  perdido: "Perdido",
  fora_de_uso: "Fora de Uso",
};

const STATUS_CFG: Record<
  EquipmentStatus,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  em_dia: { label: "Em Dia", color: "success" },
  a_vencer: { label: "A Vencer", color: "warning" },
  vencido: { label: "Vencido", color: "error" },
  sem_data: { label: "Sem Data", color: "default" },
  danificado: { label: "Danificado", color: "error" },
  perdido: { label: "Perdido", color: "default" },
  fora_de_uso: { label: "Fora de Uso", color: "default" },
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
        gap: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, minWidth: 160 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} textAlign="right">
        {String(value)}
      </Typography>
    </Box>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getEquipment(Number(id))
      .then(({ data }) => setEquipment(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!equipment) {
    return (
      <Box sx={{ textAlign: "center", py: 10 }}>
        <Typography color="text.secondary">Equipamento não encontrado.</Typography>
        <Button onClick={() => navigate("/equipment")} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  const statusCfg = STATUS_CFG[equipment.status] ?? { label: equipment.status, color: "default" as const };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/equipment")}
          variant="outlined"
          size="small"
          sx={{ color: "text.secondary", borderColor: "divider" }}
        >
          Equipamentos
        </Button>
        <Typography variant="body2" color="text.secondary">/</Typography>
        <Typography variant="body2" color="text.primary" fontWeight={500}>
          {equipment.name}
        </Typography>
      </Stack>

      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5">{equipment.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {TYPE_LABELS[equipment.equipment_type] ?? equipment.equipment_type}
            </Typography>
            {equipment.identification && (
              <>
                <Typography variant="body2" color="text.secondary">·</Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {equipment.identification}
                </Typography>
              </>
            )}
          </Stack>
        </Box>
        <Chip label={statusCfg.label} color={statusCfg.color} sx={{ fontWeight: 600 }} />
      </Box>

      <Grid container spacing={2.5}>
        {/* Equipment data */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Dados do Equipamento"
              avatar={
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha("#6366F1", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DeviceIcon sx={{ color: "#6366F1", fontSize: 20 }} />
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <InfoRow label="Nome" value={equipment.name} />
              <InfoRow label="Tipo" value={TYPE_LABELS[equipment.equipment_type] ?? equipment.equipment_type} />
              <InfoRow label="Local" value={equipment.location} />
              <InfoRow label="Modelo" value={equipment.model} />
              <InfoRow label="Fabricante" value={equipment.latest_certificate?.manufacturer} />
              <InfoRow label="Identificação" value={equipment.identification} />
              <InfoRow label="N.º de Série" value={equipment.serial_number} />
              <InfoRow label="Situação" value={SITUATION_LABELS[equipment.situation] ?? equipment.situation} />
              <InfoRow label="Faixa de Medição" value={equipment.latest_certificate?.measurement_range} />
              <InfoRow label="Resolução" value={equipment.latest_certificate?.resolution} />
            </CardContent>
          </Card>
        </Grid>

        {/* Calibration data */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Calibração"
              avatar={
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha("#14B8A6", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CalIcon sx={{ color: "#14B8A6", fontSize: 20 }} />
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <InfoRow label="N.º Certificado" value={equipment.certificate_number} />
              <InfoRow label="Frequência" value={equipment.calibration_frequency_days ? `${equipment.calibration_frequency_days} dias` : null} />
              <InfoRow label="Última Calibração" value={formatDate(equipment.last_calibration_date)} />
              <InfoRow label="Próxima Calibração" value={formatDate(equipment.next_calibration_date)} />
              {equipment.days_until_expiration != null && (
                <InfoRow
                  label="Dias para Vencimento"
                  value={
                    equipment.days_until_expiration < 0
                      ? `Vencido há ${Math.abs(equipment.days_until_expiration)} dias`
                      : `${equipment.days_until_expiration} dias`
                  }
                />
              )}
              <InfoRow label="Data de Emissão" value={formatDate(equipment.latest_certificate?.issue_date ?? null)} />
            </CardContent>
          </Card>
        </Grid>

        {/* Latest certificate */}
        {equipment.latest_certificate && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Último Certificado Importado" />
              <Divider />
              <CardContent>
                <Grid container spacing={0}>
                  <Grid item xs={12} md={6}>
                    <InfoRow label="N.º Certificado" value={equipment.latest_certificate.certificate_number} />
                    <InfoRow label="Data de Emissão" value={formatDate(equipment.latest_certificate.issue_date ?? null)} />
                    <InfoRow label="Modelo" value={equipment.latest_certificate.model} />
                    <InfoRow label="Fabricante" value={equipment.latest_certificate.manufacturer} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoRow label="N.º de Série" value={equipment.latest_certificate.serial_number} />
                    <InfoRow label="Identificação" value={equipment.latest_certificate.identification} />
                    <InfoRow label="Faixa de Medição" value={equipment.latest_certificate.measurement_range} />
                    <InfoRow label="Resolução" value={equipment.latest_certificate.resolution} />
                  </Grid>
                </Grid>
                {equipment.latest_certificate.pdf_file && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      href={equipment.latest_certificate.pdf_file}
                      target="_blank"
                    >
                      Baixar PDF do Certificado
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
