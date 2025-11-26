// src/layouts/DashboardLayout.jsx
import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box, Drawer as MuiDrawer, AppBar as MuiAppBar, Toolbar, List, CssBaseline,
  Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Stack, Avatar, Tooltip, Menu, MenuItem, Button, useScrollTrigger,
} from "@mui/material";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { ColorModeContext } from "../context/ColorModeContext";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
// import UploadFileIcon from "@mui/icons-material/UploadFile";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PeopleIcon from "@mui/icons-material/PeopleAlt";
import PersonIcon from "@mui/icons-material/Person";
import CoPresentIcon from '@mui/icons-material/CoPresent';
import WorkIcon from "@mui/icons-material/Work";
import FindInPageIcon from '@mui/icons-material/FindInPage';
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Brightness4Icon from '@mui/icons-material/Brightness4';

import Brightness7Icon from '@mui/icons-material/Brightness7';

const drawerWidth = 280;

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

const AppBar = styled(MuiAppBar, { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    // Estilos condicionales para modo claro y oscuro
    ...(theme.palette.mode === 'light'
      ? {
          // Efecto Glassmorphism para modo claro
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
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  })
);

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    width: drawerWidth,
    borderRight: `1px solid ${theme.palette.divider}`,
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
  const navigate = useNavigate();
  const location = useLocation(); // Hook para saber la ruta actual
  const { user, logout } = React.useContext(AuthContext);
  const { mode, toggleColorMode } = React.useContext(ColorModeContext);

  // === INICIALIZAMOS 'open' a false para que esté cerrado al inicio y se expanda con hover ===
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuOpen = Boolean(anchorEl);
  
  // Hook para detectar el scroll y aplicar sombra al AppBar
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  const handleDrawerOpen = () => setOpen(!open); // Ahora el botón hace toggle
  const handleDrawerClose = () => setOpen(false);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const isAdmin = user?.rol === "admin";

  const guestMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/" },
    { text: "Iniciar Sesión", icon: <LoginIcon />, path: "/login" },
    { text: "Crear Cuenta", icon: <PersonAddIcon />, path: "/register" },
  ];

  const userMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/" },
    { text: "Mi Perfil", icon: <PersonIcon />, path: "/profile" },
    { text: "Mis Postulaciones", icon: <AssignmentIndIcon />, path: "/applications/me" },
    { text: "Mi Asistencia", icon: <CoPresentIcon />, path: "/my-attendance" },
    { text: "Búsquedas activas", icon: <FindInPageIcon />, path: "/searches" },
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ];

  const adminMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/admin/dashboard" },
    { text: "Gestión de Búsquedas", icon: <WorkIcon />, path: "/admin/searches" },
    { text: "Gestión de Usuarios", icon: <AdminPanelSettingsIcon />, path: "/admin/users" },
    { text: "Gestión de Candidatos", icon: <PeopleIcon />, path: "/admin/candidates" },
    { text: "Gestión de Postulaciones", icon: <AssignmentIndIcon />, path: "/admin/applications" },
    { text: "Gestión de Asistencias", icon: <CoPresentIcon />, path: "/admin/attendance" },
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ];

  const rrhhMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/" },
    { text: " Gestión de Busquedas", icon: <WorkIcon />, path: "/admin/searches" },
    { text: " Gestión de Postulaciones", icon: <AssignmentIndIcon />, path: "/admin/applications" },
    { text: " Gestión de Candidatos", icon: <PeopleIcon />, path: "/admin/candidates"},
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ]  

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
    // No cerramos el drawer aquí si el hover es la funcionalidad principal,
    // se cerrará automáticamente al hacer mouseLeave del drawer.
    // Si quieres que se cierre al hacer clic en un ítem, puedes añadir setOpen(false); aquí.
    setOpen(false); // Mantengo este para un comportamiento más usual después de un click.
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        open={open}
        elevation={trigger ? 4 : 0} // Sombra aparece al hacer scroll
        sx={{
          // En modo claro, aplicamos el efecto blur
          ...(theme.palette.mode === 'light' && {
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 70, 128, 0.8)', // Color primario con transparencia
          })
        }}
      >
        <Toolbar sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              mr: 2,
              transition: 'transform 0.3s',
              transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />} {/* Cambia el icono si está abierto */}
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
            {/* Reemplaza '/logo.png' con la ruta a tu logo */}
            <Box component="img" src="/02.png" alt="rrhh-logo" sx={{
              height: '35px', // Ajusta la altura según necesites
              width: 'auto'
            }} />
            <Typography variant="h1" fontSize={30}  component="div" sx={{ ml: 1, color: "white", fontWeight: 700 }}>
              PORTAL-RRHH
            </Typography>
          </Box>
          
          <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          {!user ? (
            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                onClick={() => navigate("/login")}
                sx={{
                  fontWeight: 600,
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.15)'
                  }
                }}
              >
                Ingresar
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/register")}
                sx={{
                  fontWeight: 600,
                  color: 'inherit',
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    borderColor: 'white',
                  }
                }}
              >
                Registrate
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
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      navigate("/profile");
                    }}
                  >
                    Mi Perfil
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    logout();
                    navigate("/");
                  }}
                >
                  Cerrar sesión
                </MenuItem>
              </Menu>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={open}
        // Eventos para controlar la apertura y cierre con el ratón
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose} sx={{ color: theme.palette.text.primary }}>
            {theme.direction === "rtl" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: "block", my: 0.5 }}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.1 * menuItems.indexOf(item), type: "spring", stiffness: 120, damping: 20 } }}
                whileHover={{ x: 5, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
              >
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  selected={location.pathname === item.path}
                  sx={{
                    minHeight: 48,
                    px: 2.5,
                    justifyContent: open ? "initial" : "center",
                    borderRadius: '8px',
                    mx: 1.5,
                    // Estilos para el item seleccionado
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
                    mr: open ? 3 : "auto", 
                    justifyContent: "center", 
                    color: theme.palette.text.secondary,
                    transition: 'color 0.2s'
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0, color: theme.palette.text.primary }} />
                </ListItemButton>
              </motion.div>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
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