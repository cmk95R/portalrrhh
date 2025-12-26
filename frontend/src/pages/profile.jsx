import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  TextField,
  Snackbar,
  Alert,
  Skeleton,
  Avatar,
  Tabs,
  Tab,
  IconButton,
  Fade,
  Zoom,
  Divider,
  InputAdornment,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  WorkOutline as WorkIcon,
  Person as PersonIcon,
  PhotoCamera as PhotoCameraIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";

// APIs (Simuladas o importadas según tu proyecto)
import { profileApi } from "../api/auth";
import { editUserApi } from "../api/users";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const AnimatedBox = styled(Box)(({ theme }) => ({
  borderRadius: 16,
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(12px)",
  boxShadow: "0px 4px 18px rgba(0,0,0,0.12)",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    boxShadow: "0px 10px 30px rgba(0,0,0,0.18)",
    transform: "translateY(-4px)",
  },
  // Responsive padding
  padding: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const AnimatedAvatar = styled(Avatar)(({ theme }) => ({
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  transition: "all 0.25s ease-in-out",
  "&:hover": {
    transform: "scale(1.03)",
  },
}));

export default function ProfileDashboard() {
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    msg: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // --- Estado de datos del usuario ---
  const [userData, setUserData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    telefono: "",
    nacimiento: "",
    foto: "",
    cliente: "",
    direccionCliente: "",
    horarioLaboral: "",
    rol: "",
    clientes: [],
  });

  // --- Estado de dirección ---
  const [addressData, setAddressData] = useState({
    calle: "",
    numero: "",
    cp: "",
    localidad: "",
    provincia: "",
    pais: "Argentina",
  });

  const isAdminOrRRHH = userData.rol === "admin" || userData.rol === "rrhh";

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await profileApi();
      const u = data.user || {};

      setUserData({
        nombre: u.nombre || "",
        apellido: u.apellido || "",
        email: u.email || "",
        dni: u.dni || "",
        telefono: u.telefono || "",
        nacimiento: u.nacimiento ? String(u.nacimiento).slice(0, 10) : "",
        foto: u.foto || "",
        cliente: u.cliente || "",
        direccionCliente: u.direccionCliente || "",
        horarioLaboral: u.horarioLaboral || "",
        rol: u.rol || "",
        clientes: Array.isArray(u.clientes) && u.clientes.length > 0 ? u.clientes : (u.cliente ? [{ nombre: u.cliente, direccion: u.direccionCliente, horario: u.horarioLaboral }] : []),
      });

      if (u.direccion) {
        setAddressData({
          calle: u.direccion.calle || "",
          numero: u.direccion.numero || "",
          cp: u.direccion.cp || "",
          localidad: u.direccion.localidad || "",
          provincia:
            u.direccion.provincia?.nombre || u.direccion.provincia || "",
          pais: u.direccion.pais || "Argentina",
        });
      }
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg: "Error al cargar perfil.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUserChange = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setAddressData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedPhoto(file);
      setSnack({
        open: true,
        severity: "info",
        msg: "Foto seleccionada (falta implementar subida).",
      });
    }
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        telefono: userData.telefono,
        nacimiento: userData.nacimiento,
        dni: userData.dni,
        foto: userData.foto,
        direccion: { ...addressData },
        // No incluimos 'clientes' porque no se editan en esta pantalla.
        // Los campos 'cliente', 'direccionCliente' y 'horarioLaboral' se eliminan
        // porque son obsoletos.
      };

      if (!isAdminOrRRHH) {
        // Un usuario normal no puede cambiar su propio DNI.
        delete payload.dni;
      }

      await editUserApi(payload);

      setSnack({
        open: true,
        severity: "success",
        msg: "Perfil actualizado correctamente.",
      });
      setSelectedPhoto(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg: e?.response?.data?.message || "Error al guardar.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton
          variant="rectangular"
          height={420}
          sx={{ borderRadius: 2 }}
        />
      </Container>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: { xs: 2, md: 4 }, // Padding vertical responsivo
        minHeight: "100vh",
      }}
    >
      {/* Container fluido pero con limite maximo 'lg' (aprox 1200px) */}
      <Container maxWidth="lg">
       

        <Grid
          container
          spacing={3}
          justifyContent="center"
          alignItems="stretch"
        >
          {/* LADO IZQUIERDO: Card de usuario */}
          <Grid item xs={12} md={5} lg={4}>
            <Zoom in={true} timeout={700}>
              <AnimatedBox sx={{ textAlign: "center", height: "100%" }}>
                <Box
                  sx={{
                    position: "relative",
                    display: "inline-block",
                    mb: 2,
                  }}
                >
                  <AnimatedAvatar
                    src={
                      selectedPhoto instanceof File
                        ? URL.createObjectURL(selectedPhoto)
                        : userData.foto
                    }
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: "#1976d2",
                      fontSize: "3rem",
                      mx: "auto",
                      border: "4px solid white",
                    }}
                  >
                    {userData.nombre ? userData.nombre[0].toUpperCase() : "U"}
                  </AnimatedAvatar>
                  <IconButton
                    component="label"
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      bgcolor: "white",
                      boxShadow: 3,
                      "&:hover": {
                        bgcolor: "#f0f0f0",
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <PhotoCameraIcon color="primary" />
                    <VisuallyHiddenInput
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </IconButton>
                </Box>

                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{ color: "#333" }}
                >
                  {userData.nombre} {userData.apellido}
                </Typography>

                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1, fontWeight: 500 }}
                >
                  {userData.rol
                    ? `Rol: ${userData.rol.toUpperCase()}`
                    : "Usuario"}
                </Typography>

                {userData.clientes.length > 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Cliente asignado: <strong>{userData.clientes.map((c) => c.nombre).join(", ")}</strong>
                  </Typography>
                )}

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    wordBreak: "break-all", // Evita desborde si el email es largo
                  }}
                >
                  <EmailIcon fontSize="small" /> {userData.email}
                </Typography>

                {userData.dni && (
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.disabled"
                    sx={{
                      mt: 1,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <BadgeIcon fontSize="small" /> DNI: {userData.dni}
                  </Typography>
                )}
              </AnimatedBox>
            </Zoom>
          </Grid>

          {/* LADO DERECHO: Tabs + formulario */}
          <Grid item xs={12} md={7} lg={8}>
            <Fade in={true} timeout={900}>
              <AnimatedBox
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden", // Previene scrollbars indeseados
                }}
              >
                <Box
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    mb: 2,
                    // Aseguramos que los tabs no se salgan del contenedor
                    width: "100%",
                  }}
                >
                  <Tabs
                    value={tabValue}
                    onChange={(e, v) => setTabValue(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ px: 1 }}
                    TabIndicatorProps={{
                      style: { backgroundColor: "#1976d2" },
                    }}
                  >
                    <Tab
                      label="Personal"
                      iconPosition="start"
                      icon={<PersonIcon />}
                      sx={{ fontWeight: "bold", minHeight: 48 }}
                    />
                    <Tab
                      label="Laboral"
                      iconPosition="start"
                      icon={<WorkIcon />}
                      sx={{ fontWeight: "bold", minHeight: 48 }}
                    />
                  </Tabs>
                </Box>

                <form
                  autoComplete="off"
                  noValidate
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    width: "100%", // Asegura ancho completo
                  }}
                >
                  {/* Contenedor fluido para inputs */}
                  <Box sx={{ flexGrow: 1, width: "100%" }}>
                    
                    {/* TAB 0: DATOS PERSONALES */}
                    {tabValue === 0 && (
                      <Fade in timeout={400}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              disabled
                              label="Nombre"
                              value={userData.nombre}
                              onChange={(e) =>
                                handleUserChange("nombre", e.target.value)
                              }
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              disabled
                              fullWidth
                              label="Apellido"
                              value={userData.apellido}
                              onChange={(e) =>
                                handleUserChange("apellido", e.target.value)
                              }
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="DNI"
                              value={userData.dni}
                              onChange={(e) =>
                                handleUserChange("dni", e.target.value)
                              }
                              disabled={!isAdminOrRRHH}
                              helperText={
                                !isAdminOrRRHH
                                  ? "El DNI solo puede ser modificado por RRHH."
                                  : ""
                              }
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <BadgeIcon fontSize="small" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Email"
                              value={userData.email}
                              disabled
                              sx={{ bgcolor: "#f5f5f5" }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <EmailIcon fontSize="small" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Teléfono"
                              value={userData.telefono}
                              onChange={(e) =>
                                handleUserChange("telefono", e.target.value)
                              }
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PhoneIcon fontSize="small" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              
                              fullWidth
                              type="date"
                              label="Fecha de nacimiento"
                              InputLabelProps={{ shrink: true }}
                              value={userData.nacimiento}
                              onChange={(e) =>
                                handleUserChange("nacimiento", e.target.value)
                              }
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Seguridad de acceso
                              </Typography>
                            </Divider>
                            <Alert severity="info" variant="outlined">
                              Tu acceso se realiza con DNI + PIN. Para cambiar o
                              resetear tu PIN, contactá a RRHH o a un
                              administrador.
                            </Alert>
                          </Grid>
                        </Grid>
                      </Fade>
                    )}

                    {/* TAB 1: DATOS LABORALES */}
                    {tabValue === 1 && (
                      <Fade in timeout={400}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
                              Clientes Asignados
                            </Typography>
                            {userData.clientes.length === 0 && (
                              <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                                No tenés clientes asignados actualmente.
                              </Alert>
                            )}
                            {userData.clientes.map((cli, index) => (
                              <Box key={index} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fafafa' }}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      fullWidth
                                      label="Cliente"
                                      value={cli.nombre || ''}
                                      disabled
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <BusinessIcon fontSize="small" />
                                          </InputAdornment>
                                        ),
                                      }}
                                      variant="outlined"
                                      size="small"
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      fullWidth
                                      label="Dirección"
                                      value={cli.direccion || ''}
                                      disabled
                                      variant="outlined"
                                      size="small"
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      fullWidth
                                      label="Horario"
                                      value={cli.horario || ''}
                                      disabled
                                      variant="outlined"
                                      size="small"
                                    />
                                  </Grid>
                                </Grid>
                              </Box>
                            ))}
                          </Grid>

                          
                          <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                              Información laboral definida por la empresa.{" "}
                              {isAdminOrRRHH
                                ? "Como admin / RRHH podés ajustarla desde el panel de gestión."
                                : "Si necesitás cambios, contacta a Recursos Humanos."}
                            </Alert>
                          </Grid>
                        </Grid>
                      </Fade>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      p: { xs: 1, md: 2 },
                      pt: 3,
                      mt: 2,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <AnimatedButton
                      color="primary"
                      variant="contained"
                      onClick={handleFinalSave}
                      disabled={isSaving}
                      fullWidth // Full width en movil
                      sx={{
                        // En pantallas medianas hacia arriba, ancho fijo y centrado
                        maxWidth: { md: "300px" },
                        py: 1.4,
                        fontWeight: "bold",
                        borderRadius: 3,
                        boxShadow: 3,
                      }}
                    >
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </AnimatedButton>
                  </Box>
                </form>
              </AnimatedBox>
            </Fade>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}