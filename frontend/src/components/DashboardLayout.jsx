// src/layouts/DashboardLayout.jsx
import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box, Drawer as MuiDrawer, AppBar as MuiAppBar, Toolbar, List, CssBaseline,
  Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Stack, Avatar, Tooltip, Menu, MenuItem, Button,
} from "@mui/material";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";

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
import WorkIcon from "@mui/icons-material/Work";
import FindInPageIcon from '@mui/icons-material/FindInPage';
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

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
    boxShadow: 'none',
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
    color: theme.palette.common.white,
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
  const { user, logout } = React.useContext(AuthContext);

  // === INICIALIZAMOS 'open' a false para que esté cerrado al inicio y se expanda con hover ===
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuOpen = Boolean(anchorEl);

  // handleDrawerOpen y handleDrawerClose ya no se usarán por el IconButton,
  // pero los mantengo por si decides volver a un comportamiento de click.
  const handleDrawerOpen = () => setOpen(true);
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
    { text: "Búsquedas activas", icon: <FindInPageIcon />, path: "/searches" },
    { text: "Cerrar Sesión", icon: <LogoutIcon />, action: "logout" },
  ];

  const adminMenu = [
    { text: "Inicio", icon: <HomeIcon />, path: "/admin/dashboard" },
    { text: "Gestión de Búsquedas", icon: <WorkIcon />, path: "/admin/searches" },
    { text: "Gestión de Usuarios", icon: <AdminPanelSettingsIcon />, path: "/admin/users" },
    { text: "Gestión de Candidatos", icon: <PeopleIcon />, path: "/admin/candidates" },
    { text: "Gestión de Postulaciones", icon: <AssignmentIndIcon />, path: "/admin/applications" },
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
      <AppBar position="fixed" open={open}>
        <Toolbar sx={{ display: "flex", alignItems: "center" }}>
          {/* EL ICONO DE HAMBURGUESA SE QUITA O SE HACE CONDICIONAL SI EL HOVER ES LA FORMA PRINCIPAL DE ABRIR */}
          {/* Si quieres mantenerlo para una apertura manual en móviles o como alternativa: */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen} // Ahora este botón abre/cierra manualmente
            edge="start"
            sx={{
              mr: 2,
              // Comentamos la siguiente línea si queremos que siempre se vea el botón para abrir manualmente
              // ...(open && { display: "none" }),
              color: theme.palette.common.white
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
            <Typography variant="h1" fontSize={30}  component="div" sx={{ ml: 1, color: theme.palette.common.white }}>
              PORTAL-RRHH
            </Typography>
          </Box>
          <Box> </Box>   
          {!user ? (
            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                onClick={() => navigate("/login")}
                sx={{
                  color: theme.palette.common.white,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Ingresar
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/register")}
                sx={{
                  bgcolor: theme.palette.common.white,
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.common.white,
                  '&:hover': {
                    bgcolor: theme.palette.grey[100],
                    borderColor: theme.palette.grey[100],
                  }
                }}
              >
                Registrate
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ mr: 1, display: { xs: "none", sm: "block" }, color: theme.palette.common.white }}>
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

      {/* === MODIFICACIÓN CLAVE PARA EL HOVER DEL DRAWER === */}
      <Drawer
        variant="permanent"
        open={open}
        // Eventos para controlar la apertura y cierre con el ratón
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <DrawerHeader>
          {/* El botón de cerrar aquí ahora se usa solo cuando el drawer está abierto por hover o click */}
          <IconButton onClick={handleDrawerClose} sx={{ color: theme.palette.text.primary }}>
            {theme.direction === "rtl" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <motion.div
              key={item.text}
              whileHover={{
                scale: 1.05,
                backgroundColor: theme.palette.action.hover,
                boxShadow: `0px 2px 8px rgba(0,0,0,0.1)`,
                transition: { type: "spring", stiffness: 300, damping: 10 }
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.1 * menuItems.indexOf(item), type: "spring", stiffness: 100 } }}
            >
              <ListItem disablePadding sx={{ display: "block" }}>
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  sx={{
                    minHeight: 48,
                    px: 2.5,
                    justifyContent: open ? "initial" : "center",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 3 : "auto", justifyContent: "center", color: theme.palette.text.secondary }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0, color: theme.palette.text.primary }} />
                </ListItemButton>
              </ListItem>
            </motion.div>
          ))}
        </List>
      </Drawer>
      {/* === FIN MODIFICACIÓN CLAVE PARA EL HOVER DEL DRAWER === */}

      <Box component="main" sx={{ flexGrow: 1 }}>
        <DrawerHeader />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  );
}