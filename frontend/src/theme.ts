import { createTheme, alpha } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#6366F1",
      light: "#818CF8",
      dark: "#4F46E5",
      contrastText: "#FFFFFF",
    },
    success: { main: "#14B8A6", light: "#5EEAD4", dark: "#0F9186" },
    warning: { main: "#F59E0B", light: "#FCD34D", dark: "#D97706" },
    error: { main: "#EF4444", light: "#FCA5A5", dark: "#DC2626" },
    info: { main: "#3B82F6" },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#111927",
      secondary: "#6C737A",
    },
    divider: "#F2F4F7",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    overline: {
      fontWeight: 700,
      letterSpacing: "0.08em",
      lineHeight: 2.5,
    },
  },
  shape: { borderRadius: 10 },
  shadows: [
    "none",
    "0px 1px 2px rgba(0,0,0,0.06)",
    "0px 1px 4px rgba(0,0,0,0.08)",
    "0px 2px 8px rgba(0,0,0,0.08)",
    "0px 4px 12px rgba(0,0,0,0.08)",
    "0px 4px 16px rgba(0,0,0,0.10)",
    "0px 8px 24px rgba(0,0,0,0.10)",
    "0px 8px 24px rgba(0,0,0,0.12)",
    "0px 12px 32px rgba(0,0,0,0.12)",
    "0px 16px 40px rgba(0,0,0,0.12)",
    "0px 16px 40px rgba(0,0,0,0.14)",
    "0px 20px 48px rgba(0,0,0,0.14)",
    "0px 20px 48px rgba(0,0,0,0.16)",
    "0px 24px 56px rgba(0,0,0,0.16)",
    "0px 24px 56px rgba(0,0,0,0.18)",
    "0px 28px 64px rgba(0,0,0,0.18)",
    "0px 28px 64px rgba(0,0,0,0.20)",
    "0px 32px 72px rgba(0,0,0,0.20)",
    "0px 32px 72px rgba(0,0,0,0.22)",
    "0px 36px 80px rgba(0,0,0,0.22)",
    "0px 36px 80px rgba(0,0,0,0.24)",
    "0px 40px 88px rgba(0,0,0,0.24)",
    "0px 40px 88px rgba(0,0,0,0.26)",
    "0px 44px 96px rgba(0,0,0,0.26)",
    "0px 44px 96px rgba(0,0,0,0.28)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "0.875rem",
        },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0px 1px 4px rgba(0,0,0,0.08)",
          border: "1px solid #F2F4F7",
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: "20px 24px 16px" },
        title: { fontSize: "1rem", fontWeight: 600, color: "#111927" },
        subheader: { fontSize: "0.8125rem", color: "#6C737A", marginTop: 2 },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "0 24px 24px",
          "&:last-child": { paddingBottom: 24 },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            backgroundColor: "#F8F9FA",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6C737A",
            borderBottom: "1px solid #F2F4F7",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #F2F4F7",
          fontSize: "0.875rem",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child .MuiTableCell-root": { borderBottom: "none" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: "0.75rem", borderRadius: 6 },
        colorSuccess: {
          backgroundColor: alpha("#14B8A6", 0.12),
          color: "#0F9186",
        },
        colorWarning: {
          backgroundColor: alpha("#F59E0B", 0.12),
          color: "#B45309",
        },
        colorError: {
          backgroundColor: alpha("#EF4444", 0.12),
          color: "#DC2626",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: "#FFFFFF",
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: "0.875rem" },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "#F2F4F7" } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 8, marginBottom: 2 },
      },
    },
  },
});
