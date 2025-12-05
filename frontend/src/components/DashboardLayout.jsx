import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box, Drawer as MuiDrawer, AppBar as MuiAppBar, Toolbar, List, CssBaseline,
  Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Stack, Avatar, Tooltip, Menu, MenuItem, Button, useScrollTrigger, useMediaQuery
} from "@mui/material";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { ColorModeContext } from "../context/ColorModeContext";

// Iconos
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonIcon from "@mui/icons-material/Person";
import CoPresentIcon from '@mui/icons-material/CoPresent';
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const drawerWidth = 280;

// === MIXINS PARA ESCRITORIO ===
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

// AppBar modificado para ignorar el ajuste de ancho en móviles
const AppBar = styled(MuiAppBar, { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    ...(theme.palette.mode === 'light'
      ? {
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        color: theme.palette.common.white,
      }
      : {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }
    ),
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    // Solo ajustamos el ancho si está abierto Y NO es móvil
    ...(open && {
      [theme.breakpoints.up('md')]: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }
    }),
  })
);

// Drawer de Escritorio (Estilizado)
const DesktopDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...(open && {
      ...openedMixin(theme),
      "& .MuiDrawer-paper": openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      "& .MuiDrawer-paper": closedMixin(theme),
    }),
  })
);

export default function DashboardLayout() {
  const theme = useTheme();
  // Hook para detectar si es pantalla móvil/tablet (menor a md = 900px)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = React.useContext(AuthContext);
  const { mode, toggleColorMode } = React.useContext(ColorModeContext);

  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuOpen = Boolean(anchorEl);

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  // Manejo inteligente del drawer según dispositivo
  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const isAdmin = user?.rol === "admin";

  // === DEFINICIÓN DE MENÚS ===
  const guestMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/" },
    { text: "Iniciar Sesión", icon: <LoginIcon />, path: "/login" },
  ];

  const userMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/" },
    { text: "Mi Perfil", icon: <PersonIcon />, path: "/profile" },
    { text: "Mi Asistencia", icon: <CoPresentIcon />, path: "/my-attendance" },
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ];

  const adminMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/admin/dashboard" },
    { text: "Gestión de Usuarios", icon: <AdminPanelSettingsIcon />, path: "/admin/users" },
    { text: "Gestión de Asistencias", icon: <CoPresentIcon />, path: "/admin/attendance" },
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ];

  const rrhhMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/" },
    { text: "Gestión de Asistencias", icon: <CoPresentIcon />, path: "/admin/attendance" },
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ];

  const getMenuItems = () => {
    if (!user) return guestMenu;
    if (user.rol === 'admin') return adminMenu;
    if (user.rol === 'rrhh') return rrhhMenu;
    return userMenu;
  };
  const menuItems = getMenuItems();

  const handleItemClick = (item) => {
    if (item.action === "logout") {
      logout();
      navigate("/");
    } else if (item.path) {
      navigate(item.path);
    }
    // En móvil, cerramos el drawer al hacer click
    if (isMobile) setOpen(false);
  };

  // === CONTENIDO DEL DRAWER (Reutilizable) ===
  // Esto evita duplicar el código de la lista para la versión móvil y escritorio
  const drawerContent = (
    <>
      <DrawerHeader>
        {/* Solo mostramos botón de cerrar si es el drawer Permanente (Desktop) o si está abierto en móvil */}
        <IconButton onClick={() => setOpen(false)} sx={{ color: theme.palette.text.primary }}>
          {theme.direction === "rtl" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {menuItems.map((item, index) => (
          <ListItem key={item.text} disablePadding sx={{ display: "block", my: 0.5 }}>
            <motion.div
              // Animación condicional: simplificada en móvil para mejor rendimiento
              initial={isMobile ? { opacity: 1 } : { opacity: 0, x: -30 }}
              animate={isMobile ? { opacity: 1 } : { opacity: 1, x: 0, transition: { delay: 0.1 * index, type: "spring", stiffness: 120, damping: 20 } }}
              whileHover={{ x: isMobile ? 0 : 5, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
            >
              <ListItemButton
                onClick={() => handleItemClick(item)}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  // En móvil siempre justificamos a la izquierda ("initial"), en desktop depende de si está abierto
                  justifyContent: (open || isMobile) ? "initial" : "center",
                  px: 2.5,
                  borderRadius: '8px',
                  mx: 1.5,
                  "&.Mui-selected": {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    }
                  },
                  "&.Mui-selected .MuiListItemIcon-root": {
                    color: theme.palette.primary.contrastText,
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 0,
                  mr: (open || isMobile) ? 3 : "auto",
                  justifyContent: "center",
                  color: theme.palette.text.secondary,
                  transition: 'color 0.2s'
                }}>
                  {item.icon}
                </ListItemIcon>

                {/* Texto siempre visible en móvil, condicional en desktop */}
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: (open || isMobile) ? 1 : 0,
                    color: theme.palette.text.primary,
                    display: (open || isMobile) ? 'block' : 'none' // Hack para que no ocupe espacio visual cuando está cerrado en desktop
                  }}
                />
              </ListItemButton>
            </motion.div>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* === APP BAR === */}
      <AppBar
        position="fixed"
        open={open}
        elevation={trigger ? 4 : 0}
        sx={{
          ...(theme.palette.mode === 'light' && {
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 70, 128, 0.8)',
          })
        }}
      >
        <Toolbar sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              mr: 2,
              // Ocultamos el botón de menú si el drawer ya está abierto EN ESCRITORIO
              // En móvil siempre queremos ver el botón (o la X dentro del drawer)
              ...(open && !isMobile && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              textDecoration: "none",
            }}
          >
            <Box component="img" src="/logo_blanco.png" alt="logo" sx={{ height: '35px', width: 'auto' }} />
            {/* Texto oculto en móvil muy pequeño para evitar overflow */}

          </Box>



          {!user ? (
            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                onClick={() => navigate("/login")}
                sx={{
                  color: theme.palette.common.white,
                  '&:hover': {
                    color: theme.palette.primary.main,
                    bgcolor: theme.palette.common.white,
                    borderColor: theme.palette.grey[100],
                  }
                }}
              > 
                Ingresar
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ mr: 1, display: { xs: "none", sm: "block" }, color: 'inherit' }}>
                Hola, <strong>{user.nombre}</strong>
              </Typography>
              <Tooltip title="Cuenta">
                <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                  <Avatar alt={user.nombre} src={user.avatarUrl || ""} sx={{ bgcolor: theme.palette.primary.light }} />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                {!isAdmin && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}>Mi Perfil</MenuItem>
                )}
                <MenuItem onClick={() => { handleMenuClose(); logout(); navigate("/"); }}>Cerrar sesión</MenuItem>
              </Menu>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* === DRAWER MÓVIL (Temporary) === */}
      <MuiDrawer
        variant="temporary"
        open={isMobile ? open : false} // Solo se abre si es móvil y open=true
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }} // Mejor rendimiento en móviles
        sx={{
          display: { xs: 'block', md: 'none' }, // Visible solo en xs y sm
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </MuiDrawer>

      {/* === DRAWER ESCRITORIO (Permanent / Mini) === */}
      <DesktopDrawer
        variant="permanent"
        open={open}
        // Eventos Hover solo en Desktop
        onMouseEnter={() => !isMobile && setOpen(true)}
        onMouseLeave={() => !isMobile && setOpen(false)}
        sx={{
          display: { xs: 'none', md: 'block' }, // Oculto en móviles
        }}
      >
        {drawerContent}
      </DesktopDrawer>

      <Box component="main" sx={{ flexGrow: 1, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, overflowX: 'hidden' }}>
        <DrawerHeader />
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}