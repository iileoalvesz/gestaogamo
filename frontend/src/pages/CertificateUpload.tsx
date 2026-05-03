import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
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
  CloudUpload as UploadIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as OkIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";
import { uploadCertificate } from "../api/equipment";

const FIELD_LABELS: Record<string, string> = {
  certificate_number: "N.º Certificado",
  issue_date: "Data de Emissão",
  serial_number: "N.º de Série",
  identification: "Identificação",
  model: "Modelo",
  manufacturer: "Fabricante",
  measurement_range: "Faixa de Medição",
  resolution: "Resolução",
};

interface UploadResult {
  equipment?: { id: number; name: string } | null;
  extracted?: Record<string, unknown>;
  updated_fields?: string[];
  message?: string;
}

export default function CertificateUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Selecione um arquivo PDF válido.");
      return;
    }
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("pdf_file", file);
      const { data } = await uploadCertificate(form);
      setResult(data as UploadResult);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? err.message ?? "Erro ao processar o certificado.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Importar Certificado</Typography>
        <Typography variant="body2" color="text.secondary">
          Faça upload de um certificado PDF para extrair e atualizar dados do equipamento
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          {/* Upload area */}
          <Card>
            <CardHeader title="Selecionar Arquivo" subheader="Certificado TECNOCERT no formato PDF" />
            <Divider />
            <CardContent>
              <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !uploading && inputRef.current?.click()}
                sx={{
                  border: "2px dashed",
                  borderColor: dragOver ? "primary.main" : "divider",
                  borderRadius: 2,
                  p: 6,
                  textAlign: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  bgcolor: dragOver ? alpha("#6366F1", 0.04) : "transparent",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: uploading ? "divider" : "primary.main",
                    bgcolor: uploading ? "transparent" : alpha("#6366F1", 0.04),
                  },
                }}
              >
                {uploading ? (
                  <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={48} />
                    <Typography variant="body1" fontWeight={500} color="text.secondary">
                      Processando certificado…
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Extraindo dados com IA
                    </Typography>
                  </Stack>
                ) : (
                  <Stack alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha("#6366F1", 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 0.5,
                      }}
                    >
                      <UploadIcon sx={{ fontSize: 32, color: "primary.main" }} />
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      Arraste o PDF aqui ou{" "}
                      <Box component="span" sx={{ color: "primary.main" }}>
                        clique para selecionar
                      </Box>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Apenas arquivos .pdf — certificados TECNOCERT
                    </Typography>
                  </Stack>
                )}
              </Box>

              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={onInputChange}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {!uploading && (
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={() => inputRef.current?.click()}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Selecionar PDF
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          {/* Instructions */}
          <Card sx={{ mb: 2.5 }}>
            <CardHeader title="Como funciona" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {[
                  { step: "1", text: "Selecione o PDF do certificado de calibração TECNOCERT" },
                  { step: "2", text: "O sistema extrai automaticamente os dados com IA (Gemini)" },
                  { step: "3", text: "O equipamento correspondente é localizado pelo N.º de Série ou Identificação" },
                  { step: "4", text: "Os campos do equipamento são atualizados com os dados do certificado" },
                ].map(({ step, text }) => (
                  <Stack key={step} direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                        mt: 0.1,
                      }}
                    >
                      {step}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Result */}
        {result && (
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={result.equipment ? "Equipamento Atualizado" : "Equipamento Não Localizado"}
                avatar={
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: alpha(result.equipment ? "#14B8A6" : "#F59E0B", 0.12),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <OkIcon sx={{ color: result.equipment ? "#14B8A6" : "#F59E0B", fontSize: 20 }} />
                  </Box>
                }
              />
              <Divider />
              <CardContent>
                {result.equipment ? (
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Equipamento</Typography>
                        <Typography variant="body1" fontWeight={600}>{result.equipment.name}</Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        endIcon={<ArrowIcon />}
                        size="small"
                        onClick={() => navigate(`/equipment/${result.equipment!.id}`)}
                      >
                        Ver equipamento
                      </Button>
                    </Stack>

                    {result.updated_fields && result.updated_fields.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          Campos atualizados:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {result.updated_fields.map((f) => (
                            <Chip key={f} label={FIELD_LABELS[f] ?? f} size="small" color="success" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Nenhum equipamento foi localizado com os dados do certificado. Verifique se o N.º de Série ou Identificação está cadastrado.
                  </Alert>
                )}

                {result.extracted && Object.keys(result.extracted).length > 0 && (
                  <Box sx={{ mt: 2.5 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Dados Extraídos do PDF
                    </Typography>
                    <Grid container spacing={1}>
                      {Object.entries(result.extracted)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <Grid item xs={12} sm={6} md={4} key={k}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: "background.default",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" display="block">
                                {FIELD_LABELS[k] ?? k}
                              </Typography>
                              <Typography variant="body2" fontWeight={500}>
                                {String(v)}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                    </Grid>
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
