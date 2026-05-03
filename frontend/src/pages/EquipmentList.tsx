import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
  Search as SearchIcon,
  OpenInNew as DetailIcon,
  Add as AddIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import { getEquipmentList, createEquipment } from "../api/equipment";
import type { Equipment, EquipmentStatus, EquipmentType, Situation } from "../types";

// ─── Static config ─────────────────────────────────────────────────────────

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

const TYPE_LABELS: Record<EquipmentType, string> = {
  balanca: "Balança",
  syos: "SYOS",
  logger: "Logger",
  paquimetro: "Paquímetro",
  termometro: "Termômetro",
  outro: "Outro",
};

const SITUATION_LABELS: Record<Situation, string> = {
  ativo: "Ativo",
  danificado: "Danificado",
  perdido: "Perdido",
  fora_de_uso: "Fora de Uso",
};

const FILTERS = [
  { label: "Todos", value: "" },
  { label: "Em Dia", value: "em_dia" },
  { label: "A Vencer", value: "a_vencer" },
  { label: "Vencido", value: "vencido" },
  { label: "Sem Data", value: "sem_data" },
];

const FILTER_COLORS: Record<string, "default" | "success" | "warning" | "error"> = {
  "": "default",
  em_dia: "success",
  a_vencer: "warning",
  vencido: "error",
  sem_data: "default",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

// ─── Create Equipment Form ──────────────────────────────────────────────────

interface CreateForm {
  name: string;
  equipment_type: EquipmentType;
  location: string;
  model: string;
  identification: string;
  serial_number: string;
  certificate_number: string;
  situation: Situation;
  calibration_frequency_days: number;
  last_calibration_date: string;
  next_calibration_date: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  equipment_type: "termometro",
  location: "",
  model: "",
  identification: "",
  serial_number: "",
  certificate_number: "",
  situation: "ativo",
  calibration_frequency_days: 365,
  last_calibration_date: "",
  next_calibration_date: "",
};

function calcNextCal(last: string, freqDays: number): string {
  if (!last) return "";
  try {
    const d = new Date(last + "T00:00:00");
    d.setDate(d.getDate() + freqDays);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (eq: Equipment) => void;
}

function CreateDialog({ open, onClose, onCreated }: CreateDialogProps) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nextCalAuto =
    form.next_calibration_date ||
    calcNextCal(form.last_calibration_date, form.calibration_frequency_days);

  const set = (key: keyof CreateForm, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError("");
    onClose();
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("O nome do equipamento é obrigatório.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: Partial<Equipment> = {
        name: form.name.trim(),
        equipment_type: form.equipment_type,
        location: form.location,
        model: form.model,
        identification: form.identification,
        serial_number: form.serial_number,
        certificate_number: form.certificate_number,
        situation: form.situation,
        calibration_frequency_days: form.calibration_frequency_days,
        last_calibration_date: form.last_calibration_date || null,
        next_calibration_date: form.next_calibration_date || null,
      };
      const { data } = await createEquipment(payload);
      onCreated(data);
      handleClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      const detail = err.response?.data;
      setError(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail) || "Erro ao criar equipamento."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Novo Equipamento
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Nome *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            fullWidth
            autoFocus
            autoComplete="off"
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth size="medium">
              <InputLabel>Tipo *</InputLabel>
              <Select
                label="Tipo *"
                value={form.equipment_type}
                onChange={(e) => set("equipment_type", e.target.value)}
              >
                {(Object.entries(TYPE_LABELS) as [EquipmentType, string][]).map(
                  ([val, lbl]) => (
                    <MenuItem key={val} value={val}>
                      {lbl}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth size="medium">
              <InputLabel>Situação</InputLabel>
              <Select
                label="Situação"
                value={form.situation}
                onChange={(e) => set("situation", e.target.value)}
              >
                {(Object.entries(SITUATION_LABELS) as [Situation, string][]).map(
                  ([val, lbl]) => (
                    <MenuItem key={val} value={val}>
                      {lbl}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label="Local"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Modelo"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              fullWidth
            />
            <TextField
              label="Identificação"
              value={form.identification}
              onChange={(e) => set("identification", e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="N.º Série"
              value={form.serial_number}
              onChange={(e) => set("serial_number", e.target.value)}
              fullWidth
            />
            <TextField
              label="N.º Certificado"
              value={form.certificate_number}
              onChange={(e) => set("certificate_number", e.target.value)}
              fullWidth
            />
          </Stack>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              Calibração
            </Typography>
          </Divider>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
            <TextField
              label="Última Calibração"
              type="date"
              value={form.last_calibration_date}
              onChange={(e) => set("last_calibration_date", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Frequência (dias)"
              type="number"
              value={form.calibration_frequency_days}
              onChange={(e) =>
                set("calibration_frequency_days", Math.max(1, parseInt(e.target.value) || 365))
              }
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Próxima Calibração"
              type="date"
              value={form.next_calibration_date}
              onChange={(e) => set("next_calibration_date", e.target.value)}
              placeholder={nextCalAuto || "Auto-calculada"}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText={
                !form.next_calibration_date && nextCalAuto
                  ? `Auto: ${new Date(nextCalAuto + "T00:00:00").toLocaleDateString("pt-BR")}`
                  : "Deixe em branco para calcular automaticamente"
              }
            />
            <Box sx={{ flex: 1, pt: 0.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Status (calculado)
              </Typography>
              <Chip
                label={
                  !nextCalAuto
                    ? "Sem Data"
                    : (() => {
                        const d = new Date(nextCalAuto + "T00:00:00");
                        const diff = Math.floor(
                          (d.getTime() - Date.now()) / 86400000
                        );
                        if (diff < 0) return "Vencido";
                        if (diff <= 30) return "A Vencer";
                        return "Em Dia";
                      })()
                }
                size="small"
                color={
                  !nextCalAuto
                    ? "default"
                    : (() => {
                        const d = new Date(nextCalAuto + "T00:00:00");
                        const diff = Math.floor(
                          (d.getTime() - Date.now()) / 86400000
                        );
                        if (diff < 0) return "error";
                        if (diff <= 30) return "warning";
                        return "success";
                      })()
                }
              />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Criar Equipamento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function EquipmentList() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page + 1),
        page_size: String(rowsPerPage),
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await getEquipmentList(params);
      setItems(data.results);
      setTotal(data.count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const handleCreated = (eq: Equipment) => {
    setTotal((t) => t + 1);
    setItems((prev) => [eq, ...prev]);
    setToastMsg(`Equipamento "${eq.name}" criado com sucesso!`);
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Equipamentos</Typography>
          <Typography variant="body2" color="text.secondary">
            {total} equipamento{total !== 1 ? "s" : ""} cadastrado
            {total !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => navigate("/upload")}
            size="small"
          >
            Upload de Certificado
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            size="small"
          >
            Novo Equipamento
          </Button>
        </Stack>
      </Stack>

      <Card>
        {/* Toolbar */}
        <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Buscar por nome, ID, série…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                onClick={() => setStatusFilter(f.value)}
                color={
                  statusFilter === f.value ? FILTER_COLORS[f.value] || "primary" : "default"
                }
                variant={statusFilter === f.value ? "filled" : "outlined"}
                size="small"
                sx={{ cursor: "pointer", fontWeight: statusFilter === f.value ? 600 : 400 }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography color="text.secondary">Nenhum equipamento encontrado.</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Equipamento</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Local</TableCell>
                  <TableCell>N.º Série</TableCell>
                  <TableCell>Última Calibração</TableCell>
                  <TableCell>Próxima Calibração</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((eq) => {
                  const cfg =
                    STATUS_CFG[eq.status] ?? {
                      label: eq.status,
                      color: "default" as const,
                    };
                  return (
                    <TableRow
                      key={eq.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/equipment/${eq.id}`)}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: alpha("#6366F1", 0.1),
                              color: "#6366F1",
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {eq.name?.[0]?.toUpperCase() ?? "?"}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {eq.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {eq.identification || "—"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{TYPE_LABELS[eq.equipment_type] ?? eq.equipment_type}</TableCell>
                      <TableCell>{eq.location || "—"}</TableCell>
                      <TableCell>{eq.serial_number || "—"}</TableCell>
                      <TableCell>{formatDate(eq.last_calibration_date)}</TableCell>
                      <TableCell>{formatDate(eq.next_calibration_date)}</TableCell>
                      <TableCell>
                        <Chip label={cfg.label} color={cfg.color} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/equipment/${eq.id}`);
                            }}
                          >
                            <DetailIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </>
        )}
      </Card>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <Snackbar
        open={Boolean(toastMsg)}
        autoHideDuration={4000}
        onClose={() => setToastMsg("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setToastMsg("")} sx={{ width: "100%" }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
