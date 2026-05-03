import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Stack,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { login as apiLogin } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await apiLogin(username, password);
      login(data.access, data.refresh, data.user);
      navigate("/", { replace: true });
    } catch {
      setError("Usuário ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F8F9FA",
        p: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            component="img"
            src="/favicon.png"
            alt="Gestão Gamon"
            sx={{
              width: 72,
              height: 72,
              borderRadius: 2,
              objectFit: "contain",
              mx: "auto",
              mb: 2,
              display: "block",
            }}
          />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Bem-vindo ao Gestão Gamon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistema de Controle de Qualidade
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: "32px !important" }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Entrar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Use suas credenciais para acessar o sistema
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  required
                  autoComplete="username"
                  autoFocus
                />
                <TextField
                  label="Senha"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPass(!showPass)} edge="end" size="small">
                          {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{ mt: 1, py: 1.5, fontSize: "0.9375rem" }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Entrar"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 3 }}>
          Gamon © {new Date().getFullYear()} — Controle de Qualidade
        </Typography>
      </Box>
    </Box>
  );
}
