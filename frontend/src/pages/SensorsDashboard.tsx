import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Sensors as SensorsIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseRowIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  CheckCircleOutline as OkIcon,
  CancelOutlined as NokIcon,
  FileDownload as ExportIcon,
} from "@mui/icons-material";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  getSensorSummary,
  getSensorReadings,
  importSensorExcel,
  triggerRpa,
  getRpaStatus,
  exportSensorExcel,
} from "../api/sensors";
import type { SensorReading, SensorSummary } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtTemp(v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(2)}°C`;
}

function mondayOfLastWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek - 6);
  return monday.toISOString().split("T")[0];
}

function sundayOfLastWeek() {
  const monday = new Date(mondayOfLastWeek() + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().split("T")[0];
}

// ─── Sensor Detail Drawer ────────────────────────────────────────────────────

interface SensorDetailProps {
  summary: SensorSummary;
  periodStart: string;
  periodEnd: string;
}

function SensorDetail({ summary, periodStart, periodEnd }: SensorDetailProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSensorReadings({
        sensor_id: summary.sensor_id,
        period_start: periodStart,
        period_end: periodEnd,
        page: page + 1,
        page_size: 100,
      });
      setReadings(data.results);
      setTotal(data.count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [summary.sensor_id, periodStart, periodEnd, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Chart series
  const chartSeries = [
    {
      name: "Temperatura °C",
      data: readings.map((r) => ({
        x: new Date(r.recorded_at).getTime(),
        y: parseFloat(r.temperature),
      })),
    },
  ];

  const annotations: ApexOptions["annotations"] = {
    yaxis: [
      ...(summary.min_temp !== null
        ? [
            {
              y: summary.min_temp,
              borderColor: "#6366F1",
              label: { text: `Mín: ${summary.min_temp}°C`, style: { color: "#6366F1" } },
            },
          ]
        : []),
      ...(summary.max_temp !== null
        ? [
            {
              y: summary.max_temp,
              borderColor: "#EF4444",
              label: { text: `Máx: ${summary.max_temp}°C`, style: { color: "#EF4444" } },
            },
          ]
        : []),
    ],
  };

  const chartOptions: ApexOptions = {
    chart: { type: "line", height: 220, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#6366F1"],
    xaxis: { type: "datetime", labels: { datetimeUTC: false } },
    yaxis: { labels: { formatter: (v) => `${v.toFixed(1)}°C` } },
    annotations,
    tooltip: { x: { format: "dd/MM HH:mm" } },
    grid: { borderColor: "#F2F4F7" },
  };

  return (
    <Box sx={{ p: 2, bgcolor: alpha("#6366F1", 0.02), borderTop: "1px solid", borderColor: "divider" }}>
      {/* Stats row */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {[
          { label: "Mín Registrado", val: fmtTemp(summary.min_recorded) },
          { label: "Máx Registrado", val: fmtTemp(summary.max_recorded) },
          { label: "Média", val: fmtTemp(summary.avg_recorded) },
          { label: "Total Leituras", val: summary.total_readings.toLocaleString("pt-BR") },
          { label: "Conformes", val: summary.ok_readings.toLocaleString("pt-BR") },
        ].map((s) => (
          <Box
            key={s.label}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1.5,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              minWidth: 100,
              textAlign: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {s.label}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {s.val}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Chart */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : readings.length > 0 ? (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: "12px !important" }}>
            <ReactApexChart
              type="line"
              series={chartSeries}
              options={chartOptions}
              height={220}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Readings table */}
      {readings.length > 0 && (
        <>
          <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }}>N°</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Hora</TableCell>
                <TableCell align="right">Temperatura °C</TableCell>
                <TableCell align="right">Meta Mín</TableCell>
                <TableCell align="right">Meta Máx</TableCell>
                <TableCell align="center">OK/NÃO OK</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {readings.map((r, i) => {
                const dt = new Date(r.recorded_at);
                const data = dt.toLocaleDateString("pt-BR");
                const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <TableRow
                    key={r.id}
                    sx={{ bgcolor: r.is_ok ? "inherit" : alpha("#EF4444", 0.04) }}
                  >
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                      {page * 100 + i + 1}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{data}</TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{hora}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        color: r.is_ok ? "text.primary" : "#EF4444",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {parseFloat(r.temperature).toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                      {summary.min_temp !== null ? Number(summary.min_temp).toFixed(0) : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                      {summary.max_temp !== null ? Number(summary.max_temp).toFixed(0) : "—"}
                    </TableCell>
                    <TableCell align="center">
                      {r.is_ok ? (
                        <Chip label="OK" size="small" color="success" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                      ) : (
                        <Chip label="NÃO OK" size="small" color="error" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Box>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={100}
            rowsPerPageOptions={[100]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </>
      )}
    </Box>
  );
}

// ─── Import Dialog ────────────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (msg: string) => void;
}

function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setError("");
    onClose();
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { data } = await importSensorExcel(file);
      onImported(data.message);
      handleClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || "Erro ao importar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Importar Excel SYOS
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info" sx={{ fontSize: "0.8125rem" }}>
            Faça upload do arquivo <strong>Excel (.xlsx)</strong> exportado do SYOS
            (Análise por Período, Recorrência 10 Minutos).
          </Alert>
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              border: "2px dashed",
              borderColor: file ? "#6366F1" : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              bgcolor: file ? alpha("#6366F1", 0.04) : "transparent",
              "&:hover": { borderColor: "#6366F1", bgcolor: alpha("#6366F1", 0.04) },
            }}
          >
            <UploadIcon sx={{ fontSize: 40, color: file ? "#6366F1" : "action.active", mb: 1 }} />
            <Typography variant="body2" color={file ? "#6366F1" : "text.secondary"}>
              {file ? file.name : "Clique para selecionar o arquivo Excel"}
            </Typography>
            {file && (
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024).toFixed(0)} KB
              </Typography>
            )}
          </Box>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleUpload} variant="contained" disabled={!file || uploading}>
          {uploading ? <CircularProgress size={20} color="inherit" /> : "Importar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SensorsDashboard() {
  const [summary, setSummary] = useState<SensorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(mondayOfLastWeek);
  const [periodEnd, setPeriodEnd] = useState(sundayOfLastWeek);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [rpaRunning, setRpaRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" | "info" } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSensorSummary({ period_start: periodStart, period_end: periodEnd });
      setSummary(data);
    } catch {
      setToast({ msg: "Erro ao carregar dados dos sensores.", sev: "error" });
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    load();
  }, [load]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleRpa = async () => {
    setRpaRunning(true);
    setToast({ msg: "RPA iniciado. Aguardando download e importação automática…", sev: "info" });
    try {
      await triggerRpa();
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await getRpaStatus();
          if (!data.running) {
            if (pollRef.current) clearInterval(pollRef.current);
            setRpaRunning(false);
            if (data.status === "done") {
              setToast({ msg: `Concluído! ${data.message}`, sev: "success" });
              load(); // auto-refresh: RPA already imported into DB
            } else if (data.status === "error") {
              setToast({ msg: `Erro no RPA: ${data.message}`, sev: "error" });
            }
          }
        } catch {
          // ignore transient poll errors
        }
      }, 5000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setRpaRunning(false);
      setToast({ msg: err.response?.data?.detail || "Erro ao iniciar RPA.", sev: "error" });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportSensorExcel({ period_start: periodStart, period_end: periodEnd });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sensores_${periodStart}_${periodEnd}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ msg: "Erro ao exportar Excel.", sev: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleImported = (msg: string) => {
    setToast({ msg, sev: "success" });
    load();
  };

  const totalSensors = summary.length;
  const compliant = summary.filter((s) => s.compliance_pct >= s.meta_target).length;
  const nonCompliant = totalSensors - compliant;

  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 3 }}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h5">Sensores</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitoramento de temperatura — conformidade de {totalSensors} sensor
            {totalSensors !== 1 ? "es" : ""}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Tooltip title="Atualizar">
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <ExportIcon />}
            onClick={handleExport}
            disabled={exporting || summary.length === 0}
          >
            Exportar Excel
          </Button>
          {/* <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportOpen(true)}
          >
            Importar Excel
          </Button> */}
          <Button
            variant="contained"
            startIcon={rpaRunning ? <CircularProgress size={16} color="inherit" /> : <SensorsIcon />}
            onClick={handleRpa}
            disabled={rpaRunning}
          >
            {rpaRunning ? "Sincronizando Sensores…" : "Sincronizar Sensores"}
          </Button>
        </Stack>
      </Stack>

      {/* Period filter */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Período:
          </Typography>
          <TextField
            label="De"
            type="date"
            size="small"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
          <TextField
            label="Até"
            type="date"
            size="small"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
          <Button size="small" variant="outlined" onClick={load}>
            Aplicar
          </Button>
          {totalSensors > 0 && (
            <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
              <Chip
                label={`${compliant} conforme${compliant !== 1 ? "s" : ""}`}
                size="small"
                color="success"
                variant="outlined"
              />
              {nonCompliant > 0 && (
                <Chip
                  label={`${nonCompliant} não conforme${nonCompliant !== 1 ? "s" : ""}`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
            </Stack>
          )}
        </Box>
      </Card>

      {/* Summary table */}
      <Card>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
            <CircularProgress />
          </Box>
        ) : summary.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography color="text.secondary" gutterBottom>
              Nenhum dado encontrado para o período selecionado.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Importe um arquivo Excel SYOS ou execute o RPA para carregar os dados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell>Local / Sensor</TableCell>
                <TableCell>Padrão T°C</TableCell>
                <TableCell align="right">N° Registros</TableCell>
                <TableCell align="right">N° Conformes</TableCell>
                <TableCell align="center">% Conforme</TableCell>
                <TableCell align="center">Meta</TableCell>
                <TableCell>Mín / Méd / Máx Registrado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((row) => {
                const isExpanded = expandedId === row.sensor_id;
                const pct = row.compliance_pct;
                const meta = row.meta_target;
                const ok = pct >= meta;
                const pctColor = ok ? "#14B8A6" : "#EF4444";

                return (
                  <React.Fragment key={row.sensor_id}>
                    <TableRow
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : row.sensor_id)
                      }
                    >
                      <TableCell sx={{ width: 40, py: 1 }}>
                        <IconButton size="small">
                          {isExpanded ? (
                            <CollapseRowIcon fontSize="small" />
                          ) : (
                            <ExpandIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
                          {row.syos_nickname}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.temp_standard || (
                            row.min_temp !== null && row.max_temp !== null
                              ? `${row.min_temp} à ${row.max_temp}°C`
                              : "—"
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {row.total_readings.toLocaleString("pt-BR")}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {row.ok_readings.toLocaleString("pt-BR")}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 60 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(pct * 100, 100)}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha(pctColor, 0.15),
                                "& .MuiLinearProgress-bar": { bgcolor: pctColor },
                              }}
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: pctColor, minWidth: 48 }}
                          >
                            {fmtPct(pct)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          {fmtPct(meta)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {fmtTemp(row.min_recorded)} / {fmtTemp(row.avg_recorded)} /{" "}
                          {fmtTemp(row.max_recorded)}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail */}
                    <TableRow sx={{ p: 0 }}>
                      <TableCell colSpan={8} sx={{ p: 0, border: "none" }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <SensorDetail
                            summary={row}
                            periodStart={periodStart}
                            periodEnd={periodEnd}
                          />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          </Box>
        )}
      </Card>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast?.sev ?? "info"}
          onClose={() => setToast(null)}
          sx={{ width: "100%" }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
