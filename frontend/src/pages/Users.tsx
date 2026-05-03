import React, { useEffect, useState } from "react";
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
  IconButton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import { PersonAdd as AddIcon, Close as CloseIcon } from "@mui/icons-material";
import { getUsers, createUser, updateUser } from "../api/auth";
import type { User } from "../types";

interface CreateForm {
  username: string;
  password: string;
  full_name: string;
  email: string;
  role: "admin" | "analyst";
}

const EMPTY: CreateForm = { username: "", password: "", full_name: "", email: "", role: "analyst" };

function initial(u: User) {
  return (u.full_name || u.username || "?")[0].toUpperCase();
}

interface ToastState {
  msg: string;
  severity: "success" | "error";
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [toastState, setToastState] = useState<ToastState>({ msg: "", severity: "success" });

  const showToast = (msg: string, severity: "success" | "error") => {
    setToastState({ msg, severity });
    setToastOpen(true);
  };

  const load = async () => {
    try {
      const { data } = await getUsers();
      // Backend may return paginated {count, results} or plain array
      const list = Array.isArray(data)
        ? data
        : ((data as unknown as { results: User[] }).results ?? []);
      setUsers(list);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 403) {
        setApiError("Você não tem permissão para listar usuários.");
      } else {
        setApiError("Erro ao carregar usuários. Verifique a conexão com o backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (u: User) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
      showToast(`Usuário ${!u.is_active ? "ativado" : "desativado"} com sucesso.`, "success");
    } catch {
      showToast("Não foi possível alterar o status.", "error");
    }
  };

  const handleCreate = async () => {
    if (!form.username.trim() || !form.password) {
      setFormError("Usuário e senha são obrigatórios.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const { data } = await createUser(form);
      setUsers((prev) => [...prev, data]);
      setOpen(false);
      setForm(EMPTY);
      showToast("Usuário criado com sucesso!", "success");
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      const detail = err.response?.data;
      setFormError(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail) || "Erro ao criar usuário."
      );
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setFormError("");
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
          <Typography variant="h5">Usuários</Typography>
          <Typography variant="body2" color="text.secondary">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado
            {users.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Novo Usuário
        </Button>
      </Stack>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {apiError}
        </Alert>
      )}

      <Card>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuário</TableCell>
                <TableCell>Login</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ativo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.id}
                  hover
                  sx={{ opacity: u.is_active ? 1 : 0.55 }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor:
                            u.role === "admin"
                              ? alpha("#6366F1", 0.12)
                              : alpha("#14B8A6", 0.12),
                          color: u.role === "admin" ? "#6366F1" : "#14B8A6",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initial(u)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>
                        {u.full_name || u.username}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      @{u.username}
                    </Typography>
                  </TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role === "admin" ? "Administrador" : "Analista"}
                      size="small"
                      color={u.role === "admin" ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={u.is_active ? "Ativo" : "Inativo"}
                      size="small"
                      color={u.is_active ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={u.is_active ? "Desativar" : "Ativar"}>
                      <Switch
                        checked={u.is_active}
                        onChange={() => toggleActive(u)}
                        size="small"
                        color="success"
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && users.length === 0 && !apiError && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </Box>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          Novo Usuário
          <IconButton onClick={close} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Usuário *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              fullWidth
              autoComplete="off"
              autoFocus
            />
            <TextField
              label="Senha *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              autoComplete="new-password"
            />
            <TextField
              label="Nome completo"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
            />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Perfil
              </Typography>
              <Stack direction="row" spacing={1}>
                {(["analyst", "admin"] as const).map((r) => (
                  <Chip
                    key={r}
                    label={r === "admin" ? "Administrador" : "Analista"}
                    onClick={() => setForm({ ...form, role: r })}
                    color={form.role === r ? "primary" : "default"}
                    variant={form.role === r ? "filled" : "outlined"}
                    sx={{ cursor: "pointer", fontWeight: form.role === r ? 600 : 400 }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={close} variant="outlined" color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : "Criar Usuário"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast — always render with defined severity */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toastState.severity}
          onClose={() => setToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {toastState.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
