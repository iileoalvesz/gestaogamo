import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  IconButton,
  AppBar,
  Toolbar,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme,
  Stack,
  Badge,
  Popover,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  DevicesOther as EquipmentIcon,
  People as UsersIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  NotificationsOutlined as BellIcon,
  WarningAmber as WarnIcon,
  ErrorOutline as DangerIcon,
  ArrowForward as ArrowIcon,
  Build as CalibIcon,
  Sensors as SensorsIcon,
  DeleteSweep as ClearIcon,
  PriorityHigh as UrgentIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import type { NotifItem } from "../hooks/useNotifications";

const DRAWER_WIDTH = 280;
const DISMISSED_KEY = "gg_dismissed_notif_ids";

function getDismissed(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<number>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

// ─── Notification Panel ────────────────────────────────────────────────────

interface NotifPanelProps {
  items: NotifItem[];
  loading: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onNavigate: (id: number) => void;
  dismissed: Set<number>;
  onClear: () => void;
}

function NotifPanel({
  items,
  loading,
  anchorEl,
  onClose,
  onNavigate,
  dismissed,
  onClear,
}: NotifPanelProps) {
  const visible = items.filter((i) => !dismissed.has(i.id));
  const vencidos = visible.filter((i) => i.status === "vencido");
  const aVencer = visible.filter((i) => i.status === "a_vencer");

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{
        sx: {
          width: 380,
          maxHeight: 500,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontSize="0.9375rem" fontWeight={700}>
          Notificações
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            label={loading ? "…" : visible.length}
            size="small"
            color={
              vencidos.length > 0 ? "error" : visible.length > 0 ? "warning" : "default"
            }
            sx={{ fontWeight: 700, minWidth: 28 }}
          />
          {visible.length > 0 && (
            <Tooltip title="Limpar todas">
              <IconButton size="small" onClick={onClear} sx={{ color: "text.secondary" }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
      <Divider />

      <Box sx={{ overflowY: "auto", flexGrow: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : visible.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <BellIcon sx={{ fontSize: 40, color: "#D1D5DB", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhuma calibração pendente
            </Typography>
          </Box>
        ) : (
          <>
            {vencidos.length > 0 && (
              <NotifSection
                title="Vencidos"
                items={vencidos}
                colorScheme="error"
                onNavigate={onNavigate}
                onClose={onClose}
              />
            )}
            {aVencer.length > 0 && (
              <NotifSection
                title="A Vencer (30 dias)"
                items={aVencer}
                colorScheme="warning"
                onNavigate={onNavigate}
                onClose={onClose}
              />
            )}
          </>
        )}
      </Box>

      {visible.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.25 }}>
            <Button
              size="small"
              endIcon={<ArrowIcon fontSize="small" />}
              onClick={() => {
                onNavigate(-1);
                onClose();
              }}
              sx={{ fontSize: "0.8125rem" }}
            >
              Ver todos os equipamentos
            </Button>
          </Box>
        </>
      )}
    </Popover>
  );
}

interface NotifSectionProps {
  title: string;
  items: NotifItem[];
  colorScheme: "error" | "warning";
  onNavigate: (id: number) => void;
  onClose: () => void;
}

function NotifSection({
  title,
  items,
  colorScheme,
  onNavigate,
  onClose,
}: NotifSectionProps) {
  const color = colorScheme === "error" ? "#EF4444" : "#F59E0B";
  const bgColor =
    colorScheme === "error" ? alpha("#EF4444", 0.08) : alpha("#F59E0B", 0.08);

  return (
    <Box>
      <Box sx={{ px: 2.5, py: 0.75, bgcolor: bgColor }}>
        <Typography
          variant="overline"
          sx={{ fontSize: "0.65rem", color, fontWeight: 700 }}
        >
          {title} ({items.length})
        </Typography>
      </Box>
      {items.map((item) => (
        <Box
          key={item.id}
          onClick={() => {
            onNavigate(item.id);
            onClose();
          }}
          sx={{
            px: 2.5,
            py: 1.25,
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
            "&:last-child": { borderBottom: "none" },
          }}
        >
          <Box
            sx={{
              mt: 0.2,
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {colorScheme === "error" ? (
              <DangerIcon sx={{ fontSize: 16, color }} />
            ) : (
              <WarnIcon sx={{ fontSize: 16, color }} />
            )}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{
                color:
                  item.days !== null && item.days <= 1 ? "#EF4444" : "text.primary",
              }}
            >
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              {item.location}
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0, textAlign: "right" }}>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color, display: "block", whiteSpace: "nowrap" }}
            >
              {item.days == null
                ? "Sem data"
                : item.days < 0
                ? `${Math.abs(item.days)}d vencido`
                : item.days === 0
                ? "Vence HOJE"
                : `${item.days}d restantes`}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ─── Critical Alert Dialog ─────────────────────────────────────────────────

interface CriticalAlertProps {
  items: NotifItem[];
  open: boolean;
  onClose: () => void;
  onNavigate: (id: number) => void;
}

function CriticalAlertDialog({
  items,
  open,
  onClose,
  onNavigate,
}: CriticalAlertProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", gap: 1, color: "#EF4444" }}
      >
        <UrgentIcon />
        Alerta: Calibração Crítica
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          {items.length} equipamento{items.length > 1 ? "s" : ""} vence
          {items.length === 1 ? "" : "m"} hoje ou amanhã — ação imediata necessária!
        </Alert>
        <Stack spacing={1}>
          {items.map((item) => (
            <Box
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: alpha("#EF4444", 0.35),
                bgcolor: alpha("#EF4444", 0.04),
                cursor: "pointer",
                "&:hover": { bgcolor: alpha("#EF4444", 0.09) },
              }}
            >
              <Typography variant="body2" fontWeight={700} color="#EF4444">
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.location} —{" "}
                {item.days === 0 ? "Vence HOJE!" : "Vence amanhã"}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Fechar
        </Button>
        <Button
          onClick={() => {
            onNavigate(-1);
            onClose();
          }}
          variant="contained"
          color="error"
        >
          Ver Equipamentos
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

interface SidebarProps {
  onClose?: () => void;
}

function SidebarContent({ onClose }: SidebarProps) {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { items, loading, playChime } = useNotifications();

  const [bellAnchor, setBellAnchor] = useState<HTMLElement | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => getDismissed());
  const [criticalOpen, setCriticalOpen] = useState(false);
  const criticalShownRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    const critical = items.filter((i) => i.days !== null && i.days <= 1);
    if (critical.length > 0 && !criticalShownRef.current) {
      criticalShownRef.current = true;
      setCriticalOpen(true);
      try {
        playChime(true);
      } catch {
        /* ignore autoplay block */
      }
    }
  }, [items, loading, playChime]);

  const go = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const active = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navItemSx = (isActive: boolean) => ({
    borderRadius: 1.5,
    mb: 0.5,
    px: 1.5,
    py: 0.875,
    color: isActive ? "#FFFFFF" : "#9DA4AE",
    backgroundColor: isActive ? alpha("#FFFFFF", 0.1) : "transparent",
    "&:hover": { backgroundColor: alpha("#FFFFFF", 0.06), color: "#FFFFFF" },
    "&.Mui-selected": { backgroundColor: alpha("#FFFFFF", 0.1) },
  });

  const handleBellClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setBellAnchor(e.currentTarget);
    if (items.some((i) => i.status === "vencido")) {
      playChime(true);
    } else if (items.length > 0) {
      playChime(false);
    }
  };

  const handleClear = () => {
    const newDismissed = new Set(dismissedIds);
    items.forEach((i) => newDismissed.add(i.id));
    setDismissedIds(newDismissed);
    saveDismissed(newDismissed);
  };

  const handleNotifNavigate = (id: number) => {
    if (id === -1) {
      navigate("/equipment");
    } else {
      navigate(`/equipment/${id}`);
    }
    onClose?.();
  };

  const visible = items.filter((i) => !dismissedIds.has(i.id));
  const visibleVencidoCount = visible.filter((i) => i.status === "vencido").length;
  const badgeColor =
    visibleVencidoCount > 0 ? "error" : visible.length > 0 ? "warning" : "default";
  const criticalItems = items.filter((i) => i.days !== null && i.days <= 1);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#1C2536",
        overflowY: "auto",
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: alpha("#FFFFFF", 0.1),
          borderRadius: 2,
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            component="img"
            src="/favicon.png"
            alt="Gestão Gamon"
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.5,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="#FFFFFF"
              lineHeight={1.2}
            >
              Gestão Gamon
            </Typography>
            <Typography variant="caption" sx={{ color: "#9DA4AE", lineHeight: 1 }}>
              Gestão de Qualidade
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: alpha("#FFFFFF", 0.07) }} />

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, px: 2, py: 2 }}>
        <List disablePadding>
          {[
            { label: "Dashboard", path: "/", icon: <DashboardIcon fontSize="small" /> },
            { label: "Calibração de Equipamentos", path: "/equipment", icon: <CalibIcon fontSize="small" /> },
            { label: "Sensores", path: "/sensors", icon: <SensorsIcon fontSize="small" /> },
          ].map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => go(item.path)}
              selected={active(item.path)}
              sx={navItemSx(active(item.path))}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: active(item.path) ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>

        {/* ── Administração ── */}
        {isAdmin && (
          <>
            <Typography
              variant="overline"
              sx={{
                color: "#9DA4AE",
                px: 1,
                fontSize: "0.65rem",
                lineHeight: 2.5,
                display: "block",
                mt: 1.5,
              }}
            >
              Administração
            </Typography>
            <List disablePadding>
              <ListItemButton
                onClick={() => go("/users")}
                selected={active("/users")}
                sx={navItemSx(active("/users"))}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                  <UsersIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Usuários"
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: active("/users") ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </List>
          </>
        )}
      </Box>

      <Divider sx={{ borderColor: alpha("#FFFFFF", 0.07) }} />

      {/* User footer */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar
          sx={{
            bgcolor: alpha("#6366F1", 0.8),
            width: 36,
            height: 36,
            fontSize: "0.9rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(user?.full_name || user?.username || "U")[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} color="#FFFFFF" noWrap>
            {user?.full_name || user?.username}
          </Typography>
          <Typography variant="caption" sx={{ color: "#9DA4AE" }}>
            {user?.role === "admin" ? "Administrador" : "Analista"}
          </Typography>
        </Box>

        {/* Bell */}
        <Tooltip title="Notificações" placement="right">
          <IconButton
            ref={bellRef}
            size="small"
            onClick={handleBellClick}
            sx={{
              color:
                visible.length > 0
                  ? visibleVencidoCount > 0
                    ? "#EF4444"
                    : "#F59E0B"
                  : "#9DA4AE",
              "&:hover": { color: "#FFFFFF" },
            }}
          >
            <Badge
              badgeContent={loading ? 0 : visible.length}
              color={badgeColor as "error" | "warning" | "default"}
              max={99}
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.6rem",
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                },
              }}
            >
              <BellIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Logout */}
        <Tooltip title="Sair" placement="right">
          <IconButton
            size="small"
            onClick={logout}
            sx={{ color: "#9DA4AE", "&:hover": { color: "#FFFFFF" } }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Notification Popover */}
      <NotifPanel
        items={items}
        loading={loading}
        anchorEl={bellAnchor}
        onClose={() => setBellAnchor(null)}
        onNavigate={handleNotifNavigate}
        dismissed={dismissedIds}
        onClear={handleClear}
      />

      {/* Critical 1-day Alert */}
      <CriticalAlertDialog
        items={criticalItems}
        open={criticalOpen}
        onClose={() => setCriticalOpen(false)}
        onNavigate={handleNotifNavigate}
      />
    </Box>
  );
}

// ─── Layout Shell ──────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Box sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
          <Box
            sx={{
              width: DRAWER_WIDTH,
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              borderRight: `1px solid ${alpha("#FFFFFF", 0.04)}`,
            }}
          >
            <SidebarContent />
          </Box>
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            border: "none",
          },
        }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </Drawer>

      {/* Main */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {isMobile && (
          <AppBar
            position="sticky"
            color="inherit"
            elevation={0}
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Toolbar variant="dense">
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
                Gestão Gamon
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
