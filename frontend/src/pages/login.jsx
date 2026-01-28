import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import AccountCircle from "@mui/icons-material/AccountCircle";
import Lock from "@mui/icons-material/Lock";

import { loginApi } from "../api/auth";

import { AuthContext } from "../context/AuthContext";

// --- Estilos para un JSX más limpio ---
const styles = {
  // Keyframes para las animaciones
  "@keyframes gradient": {
    "0%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
    "100%": { backgroundPosition: "0% 50%" },
  },
  "@keyframes float": {
    "0%": { transform: "translateY(0px)" },
    "50%": { transform: "translateY(-8px)" },
    "100%": { transform: "translateY(0px)" },
  },
  "@keyframes shake": {
    "10%, 90%": { transform: "translateX(-1px)" },
    "20%, 80%": { transform: "translateX(2px)" },
    "30%, 50%, 70%": { transform: "translateX(-4px)" },
    "40%, 60%": { transform: "translateX(4px)" },
  },
  rootBox: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    py: 8,
    // --- 2. VOLVEMOS AL GRADIENTE ORIGINAL ---
    background: "linear-gradient(180deg, #e3e8f7 0%, #d2d8e8 100%)",
  },
  logo: {
    height: 80,
    mb: 1,
    // Animación de flote para el logo
    animation: "float 6s ease-in-out infinite",
  },
  paper: (animate, hasError) => ({
    p: { xs: 3, md: 6 },
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    boxShadow: "0px 10px 30px -5px rgba(0, 0, 0, 0.1)",
    transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
    opacity: animate ? 1 : 0,
    transform: animate ? "translateY(0)" : "translateY(20px)",
    // Animación de vibración en caso de error
    animation: hasError ? "shake 0.82s cubic-bezier(.36,.07,.19,.97) both" : "none",
  }),
  submitButton: {
    mt: 2,
    py: 1.5,
    fontWeight: 700,
    fontSize: "1rem",
    transition: "background-color 0.3s, box-shadow 0.3s",
    backgroundColor: "#173487", // 👈 Movido aquí desde la prop del componente
    "&:hover": {
      boxShadow: "0px 4px 20px -5px rgba(71, 98, 189, 0.8)",
      backgroundColor: "#122a6b", // Color un poco más oscuro para el hover
    },
    // Efecto de pulsación al hacer clic
    "&:active": {
      transform: "scale(0.98)",
    },
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useContext(AuthContext);

  const [form, setForm] = useState({ dni: "", pin: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState({});
  const [animate, setAnimate] = useState(false);

  const redirectTo =
    new URLSearchParams(location.search).get("redirectTo") || "/";

  // Efecto para la animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "dni":
        if (!value) error = "El DNI es requerido.";
        else if (!/^\d{6,9}$/.test(value))
          error = "El DNI debe ser numérico (6 a 9 dígitos).";
        break;
      case "pin":
        if (!value) error = "El PIN es requerido.";
        else if (!/^\d{4,6}$/.test(value))
          error = "El PIN debe ser numérico (4 a 6 dígitos).";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error, general: "" }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setForm((prev) => ({ ...prev, [name]: val }));
    validateField(name, val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar antes de enviar
    validateField("dni", form.dni);
    validateField("pin", form.pin);

    const hasErrors =
      !form.dni ||
      !form.pin ||
      !!errors.dni ||
      !!errors.pin;

    if (hasErrors) {
      setErrors((prev) => ({
        ...prev,
        general: "Por favor, completa todos los campos correctamente.",
      }));
      setTimeout(() => setErrors(prev => ({ ...prev, general: "" })), 100); // Limpia el error para poder re-animar
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // 🔐 Ahora el login es por DNI + PIN
      const { data } = await loginApi({ dni: form.dni, pin: form.pin });

      localStorage.setItem("token", data.token);
      setUser(data.user);

      // Redirección según rol
      if (data.user.rol === "admin" || data.user.rol === "rrhh") {
        navigate("/admin/dashboard");
      } else {
        // Empleado: lo podés mandar a algún home de asistencia
        navigate(redirectTo || "/attendance");
      }
    } catch (err) {
      const apiErrors = err?.response?.data;

      if (err.response?.status === 403 && apiErrors?.message) {
        // Cuenta inhabilitada
        setErrors({ general: apiErrors.message });
      } else if (apiErrors?.errors) {
        // Errores de validación desde backend
        const newErrors = {};
        apiErrors.errors.forEach((error) => {
          newErrors[error.path] = error.msg;
        });
        setErrors(newErrors);
      } else {
        setErrors({
          general: apiErrors?.message || "DNI o PIN incorrectos.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={styles.rootBox}>
      <style>{`@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0px); } } @keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }`}</style>
      <Container maxWidth="sm">
        <Stack
          direction="column"
          alignItems="center"
          spacing={1}
          sx={{ mb: 3 }}
        >
          <Box
            component="img"
            src="/logo3.png"
            alt="Logo Corporativo"
            sx={styles.logo}
          />
        </Stack>

        <Paper sx={styles.paper(animate, !!errors.general)} elevation={12}>
        <form
          id="login-form"
          onSubmit={handleSubmit}
          style={{ width: "100%" }}
        >
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Bienvenido
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Ingresá con tu DNI y PIN asignado por RRHH.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="DNI"
              type="text"
              name="dni"
              value={form.dni}
              onChange={handleChange}
              fullWidth
              error={!!errors.dni}
              helperText={errors.dni}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle color={errors.dni ? "error" : "action"} />
                  </InputAdornment>
                ),
              }}
              sx={{ "&:hover .MuiOutlinedInput-root": { "& > fieldset": { borderColor: "primary.main" } } }}
            />

            <TextField
              label="PIN"
              type={showPin ? "text" : "password"}
              name="pin"
              value={form.pin}
              onChange={handleChange}
              fullWidth
              error={!!errors.pin}
              helperText={errors.pin}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color={errors.pin ? "error" : "action"} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPin ? "Ocultar PIN" : "Mostrar PIN"
                      }
                      onClick={() => setShowPin((v) => !v)}
                      edge="end"
                    >
                      {showPin ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ "&:hover .MuiOutlinedInput-root": { "& > fieldset": { borderColor: "primary.main" } } }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                />
              }
              label="Recordarme en este dispositivo"
            />
          </Stack>

          {errors.general && (
            <Alert severity="error" sx={{ mt: 2, width: "100%" }}>
              {errors.general}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={styles.submitButton}
          >
            {loading ? (
              <CircularProgress size={26} color="inherit" />
            ) : (
              "INGRESAR"
            )}
          </Button>

          <Typography align="center" sx={{ mt: 2 }} variant="body2">
            ¿Problemas para ingresar? Contactá con RRHH o tu administrador.
          </Typography>
        </form>
        </Paper>
      </Container>
    </Box>
  );
}
