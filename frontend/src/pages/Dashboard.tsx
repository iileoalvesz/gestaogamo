import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DevicesOther as TotalIcon,
  CheckCircleOutline as OkIcon,
  WarningAmber as WarnIcon,
  ErrorOutline as ExpiredIcon,
  HelpOutline as NoDataIcon,
  Sensors as SensorsIcon,
  ThermostatAuto as ThermoIcon,
  VerifiedOutlined as ConformeIcon,
  GppBad as NaoConformeIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { getDashboard } from "../api/equipment";
import { getSensorSummary } from "../api/sensors";
import type { DashboardData, EquipmentType, EquipmentStatus, SensorSummary } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mondayOfLastWeek() {
  const today = new Date();
  const dow = today.getDay() === 0 ? 7 : today.getDay();
  const d = new Date(today);
  d.setDate(today.getDate() - dow - 6);
  return d.toISOString().split("T")[0];
}
function sundayOfLastWeek() {
  const d = new Date(mondayOfLastWeek() + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

const TYPE_LABELS: Record<EquipmentType, string> = {
  balanca: "Balança",
  syos: "SYOS",
  logger: "Logger",
  paquimetro: "Paquímetro",
  termometro: "Termômetro",
  outro: "Outro",
};

const STATUS_CFG: Record<
  EquipmentStatus,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  em_dia:      { label: "Em Dia",      color: "success" },
  a_vencer:    { label: "A Vencer",    color: "warning" },
  vencido:     { label: "Vencido",     color: "error" },
  sem_data:    { label: "Sem Data",    color: "default" },
  danificado:  { label: "Danificado",  color: "error" },
  perdido:     { label: "Perdido",     color: "default" },
  fora_de_uso: { label: "Fora de Uso", color: "default" },
};

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sub: string;
}

function MetricCard({ title, value, icon, iconBg, iconColor, sub }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: "20px !important" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, mb: 0.5, fontSize: "1.75rem" }}>
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{sub}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: iconBg, color: iconColor, width: 52, height: 52, borderRadius: 2 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, accent }: { icon: React.ReactNode; title: string; accent: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5, mt: 1 }}>
      <Box
        sx={{
          width: 4, height: 28, borderRadius: 2,
          bgcolor: accent, flexShrink: 0,
        }}
      />
      <Avatar sx={{ bgcolor: alpha(accent, 0.12), color: accent, width: 32, height: 32 }}>
        {icon}
      </Avatar>
      <Typography variant="h6" fontWeight={700} color="text.primary">
        {title}
      </Typography>
    </Stack>
  );
}

// ─── Sensor Section ───────────────────────────────────────────────────────────

interface SensorSectionProps {
  sensors: SensorSummary[];
  periodLabel: string;
}

function SensorSection({ sensors, periodLabel }: SensorSectionProps) {
  const navigate = useNavigate();
  const META = 0.85;

  if (sensors.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center", py: 5,
          bgcolor: alpha("#6366F1", 0.03),
          borderRadius: 2, border: "1px dashed", borderColor: "divider",
        }}
      >
        <SensorsIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography color="text.secondary" variant="body2">
          Nenhum dado de sensor disponível para o período selecionado.
        </Typography>
        <Typography
          variant="caption" color="primary.main" sx={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => navigate("/sensors")}
        >
          Ir para Sensores para Sincronizar
        </Typography>
      </Box>
    );
  }

  const conformes    = sensors.filter((s) => s.compliance_pct >= META).length;
  const naoConformes = sensors.length - conformes;
  const avgCompliance =
    sensors.reduce((acc, s) => acc + s.compliance_pct, 0) / sensors.length;

  return (
    <>
      {/* Metric cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total de Sensores"
            value={sensors.length}
            icon={<SensorsIcon />}
            iconBg={alpha("#6366F1", 0.12)}
            iconColor="#6366F1"
            sub={periodLabel}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Conformes (≥ 85%)"
            value={conformes}
            icon={<ConformeIcon />}
            iconBg={alpha("#14B8A6", 0.12)}
            iconColor="#14B8A6"
            sub={`${Math.round((conformes / sensors.length) * 100)}% dos sensores`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Não Conformes"
            value={naoConformes}
            icon={<NaoConformeIcon />}
            iconBg={naoConformes > 0 ? alpha("#EF4444", 0.12) : alpha("#14B8A6", 0.08)}
            iconColor={naoConformes > 0 ? "#EF4444" : "#14B8A6"}
            sub={naoConformes > 0 ? "Atenção necessária" : "Todos conformes"}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Conformidade Geral"
            value={`${(avgCompliance * 100).toFixed(1)}%`}
            icon={<ThermoIcon />}
            iconBg={avgCompliance >= META ? alpha("#14B8A6", 0.12) : alpha("#EF4444", 0.12)}
            iconColor={avgCompliance >= META ? "#14B8A6" : "#EF4444"}
            sub={`Meta: ${(META * 100).toFixed(0)}%`}
          />
        </Grid>
      </Grid>

      {/* Compliance table */}
      <Card>
        <CardHeader
          title="Conformidade por Sensor"
          subheader={`${periodLabel} — clique para ver detalhes`}
          action={
            <Typography
              variant="caption"
              color="primary.main"
              sx={{ cursor: "pointer", textDecoration: "underline", pr: 1, lineHeight: 3 }}
              onClick={() => navigate("/sensors")}
            >
              Ver detalhes completos →
            </Typography>
          }
        />
        <Divider />
        <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Local / Sensor</TableCell>
              <TableCell>Padrão T°C</TableCell>
              <TableCell align="right">Registros</TableCell>
              <TableCell align="right">OK</TableCell>
              <TableCell sx={{ minWidth: 180 }}>% Conformidade</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sensors.map((s) => {
              const ok = s.compliance_pct >= META;
              const pctVal = Math.round(s.compliance_pct * 100);
              return (
                <TableRow
                  key={s.sensor_id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate("/sensors")}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{s.name}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
                      {s.syos_nickname}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{s.temp_standard || "—"}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{s.total_readings.toLocaleString("pt-BR")}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{s.ok_readings.toLocaleString("pt-BR")}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pctVal, 100)}
                        sx={{
                          flex: 1, height: 6, borderRadius: 3,
                          bgcolor: alpha(ok ? "#14B8A6" : "#EF4444", 0.15),
                          "& .MuiLinearProgress-bar": { bgcolor: ok ? "#14B8A6" : "#EF4444", borderRadius: 3 },
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={ok ? "#0D9488" : "#DC2626"}
                        sx={{ minWidth: 40, textAlign: "right" }}
                      >
                        {pctVal}%
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={ok ? "Conforme" : "Não Conforme"}
                      color={ok ? "success" : "error"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </Box>
      </Card>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [equipData, setEquipData] = useState<DashboardData | null>(null);
  const [sensorData, setSensorData] = useState<SensorSummary[]>([]);
  const [loadingEquip, setLoadingEquip] = useState(true);
  const [loadingSensor, setLoadingSensor] = useState(false);
  const [sensorStart, setSensorStart] = useState(mondayOfLastWeek);
  const [sensorEnd, setSensorEnd] = useState(sundayOfLastWeek);
  const [appliedStart, setAppliedStart] = useState(mondayOfLastWeek);
  const [appliedEnd, setAppliedEnd] = useState(sundayOfLastWeek);

  useEffect(() => {
    getDashboard()
      .then(({ data }) => setEquipData(data))
      .catch(console.error)
      .finally(() => setLoadingEquip(false));
  }, []);

  const loadSensors = useCallback((start: string, end: string) => {
    setLoadingSensor(true);
    getSensorSummary({ period_start: start, period_end: end })
      .then(({ data }) => setSensorData(data))
      .catch(() => setSensorData([]))
      .finally(() => setLoadingSensor(false));
  }, []);

  useEffect(() => {
    loadSensors(appliedStart, appliedEnd);
  }, [loadSensors, appliedStart, appliedEnd]);

  const handleApplySensorFilter = () => {
    setAppliedStart(sensorStart);
    setAppliedEnd(sensorEnd);
  };

  const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
  const periodLabel = `${fmtDate(appliedStart)} – ${fmtDate(appliedEnd)}`;

  if (loadingEquip) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!equipData) return null;

  const typeEntries = Object.entries(equipData.by_type) as [EquipmentType, (typeof equipData.by_type)[EquipmentType]][];
  const pct = (n: number) =>
    equipData.total > 0 ? `${Math.round((n / equipData.total) * 100)}% do total` : "0%";

  const barOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "55%", borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: typeEntries.map(([k]) => TYPE_LABELS[k] ?? k),
      labels: { style: { colors: "#6C737A", fontSize: "12px", fontFamily: "Inter, sans-serif" } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#6C737A", fontFamily: "Inter, sans-serif" } } },
    grid: { strokeDashArray: 4, borderColor: "#F2F4F7", yaxis: { lines: { show: true } } },
    colors: ["#14B8A6", "#F59E0B", "#EF4444"],
    legend: {
      show: true, position: "top", horizontalAlign: "right",
      fontSize: "12px", fontFamily: "Inter, sans-serif", markers: { size: 8, shape: "circle" },
    },
    tooltip: { style: { fontFamily: "Inter, sans-serif" } },
    states: { hover: { filter: { type: "darken", value: 0.9 } } },
  };

  const barSeries = [
    { name: "Em Dia",   data: typeEntries.map(([, v]) => v.em_dia) },
    { name: "A Vencer", data: typeEntries.map(([, v]) => v.a_vencer) },
    { name: "Vencido",  data: typeEntries.map(([, v]) => v.vencido) },
  ];

  const donutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "Inter, sans-serif" },
    labels: ["Em Dia", "A Vencer", "Vencido", "Sem Data"],
    colors: ["#14B8A6", "#F59E0B", "#EF4444", "#9CA3AF"],
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true, label: "Total",
              fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif",
              color: "#6C737A", formatter: () => String(equipData.total),
            },
            value: { fontSize: "22px", fontWeight: 700, fontFamily: "Inter, sans-serif", color: "#111927" },
          },
        },
      },
    },
    legend: {
      position: "bottom", fontSize: "12px", fontFamily: "Inter, sans-serif",
      markers: { size: 8, shape: "circle" }, offsetY: 8,
    },
    stroke: { width: 0 },
    tooltip: { style: { fontFamily: "Inter, sans-serif" } },
  };

  const donutSeries = [equipData.em_dia, equipData.a_vencer, equipData.vencido, equipData.sem_data];

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Visão integrada — Calibração de Equipamentos e Monitoramento de Sensores
        </Typography>
      </Box>

      {/* ══ SEÇÃO: CALIBRAÇÃO DE EQUIPAMENTOS ══════════════════════════════ */}
      <SectionHeader icon={<TotalIcon fontSize="small" />} title="Calibração de Equipamentos" accent="#6366F1" />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total de Equipamentos"
            value={equipData.total}
            icon={<TotalIcon />}
            iconBg={alpha("#6366F1", 0.12)}
            iconColor="#6366F1"
            sub={`${equipData.inativos} inativos`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Em Dia"
            value={equipData.em_dia}
            icon={<OkIcon />}
            iconBg={alpha("#14B8A6", 0.12)}
            iconColor="#14B8A6"
            sub={pct(equipData.em_dia)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="A Vencer (30d)"
            value={equipData.a_vencer}
            icon={<WarnIcon />}
            iconBg={alpha("#F59E0B", 0.12)}
            iconColor="#F59E0B"
            sub={pct(equipData.a_vencer)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Vencidos"
            value={equipData.vencido}
            icon={<ExpiredIcon />}
            iconBg={alpha("#EF4444", 0.12)}
            iconColor="#EF4444"
            sub={pct(equipData.vencido)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: "100%" }}>
            <CardHeader title="Equipamentos por Tipo" subheader="Distribuição de status por categoria" />
            <Divider />
            <CardContent>
              <ReactApexChart type="bar" options={barOptions} series={barSeries} height={280} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: "100%" }}>
            <CardHeader title="Status Geral" subheader="Distribuição percentual" />
            <Divider />
            <CardContent>
              <ReactApexChart type="donut" options={donutOptions} series={donutSeries} height={280} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {equipData.expiring_soon.length > 0 && (
        <Card sx={{ mb: 2.5 }}>
          <CardHeader
            title="Calibrações a Vencer"
            subheader="Equipamentos com vencimento nos próximos 30 dias"
          />
          <Divider />
          <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Equipamento</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Local</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell align="center">Dias</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipData.expiring_soon.map((eq) => {
                const cfg = STATUS_CFG[eq.status] ?? { label: eq.status, color: "default" as const };
                const urgent = eq.days_until_expiration <= 7;
                return (
                  <TableRow key={eq.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/equipment/${eq.id}`)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{eq.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{eq.identification}</Typography>
                    </TableCell>
                    <TableCell>{TYPE_LABELS[eq.equipment_type] ?? eq.equipment_type}</TableCell>
                    <TableCell>{eq.location}</TableCell>
                    <TableCell>
                      {eq.next_calibration_date
                        ? new Date(eq.next_calibration_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 44, height: 24, borderRadius: 1,
                        bgcolor: urgent ? alpha("#EF4444", 0.12) : alpha("#F59E0B", 0.12),
                        color: urgent ? "#DC2626" : "#B45309",
                        fontSize: "0.75rem", fontWeight: 700,
                      }}>
                        {eq.days_until_expiration}d
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={cfg.label} color={cfg.color} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Box>
        </Card>
      )}

      {equipData.sem_data > 0 && (
        <Card sx={{ mb: 2.5, p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: alpha("#9CA3AF", 0.12), color: "#9CA3AF", width: 36, height: 36 }}>
              <NoDataIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {equipData.sem_data} equipamento{equipData.sem_data !== 1 ? "s" : ""} sem data de calibração
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cadastre uma data de calibração para esses equipamentos
              </Typography>
            </Box>
          </Stack>
        </Card>
      )}

      {/* ══ SEÇÃO: SENSORES ════════════════════════════════════════════════ */}
      <Divider sx={{ my: 3 }} />
      <SectionHeader icon={<SensorsIcon fontSize="small" />} title="Monitoramento de Sensores" accent="#14B8A6" />

      {/* Filtro de período dos sensores */}
      <Card sx={{ mb: 2.5 }}>
        <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Período:
          </Typography>
          <TextField
            label="De"
            type="date"
            size="small"
            value={sensorStart}
            onChange={(e) => setSensorStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
          <TextField
            label="Até"
            type="date"
            size="small"
            value={sensorEnd}
            onChange={(e) => setSensorEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
          <Button size="small" variant="outlined" onClick={handleApplySensorFilter}>
            Aplicar
          </Button>
          <Tooltip title="Atualizar">
            <IconButton
              size="small"
              onClick={() => loadSensors(appliedStart, appliedEnd)}
              disabled={loadingSensor}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {loadingSensor && <CircularProgress size={20} />}
        </Box>
      </Card>

      {loadingSensor ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <SensorSection sensors={sensorData} periodLabel={periodLabel} />
      )}
    </Box>
  );
}
