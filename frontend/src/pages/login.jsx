import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  InputAdornment,
  Divider,
  Alert,
} from "@mui/material";
import SocialLogin from "../components/socialLogin";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { loginApi } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

// Iconitos simples (SVG inline) para Google/Facebook
const GoogleIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 48 48" {...props}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 31.9 30 35 24 35c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.7 3.3 29.6 1 24 1 11.8 1 2 10.8 2 23s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.9-.4-4.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.3 16 18.8 13 24 13c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.7 6.3 29.6 4 24 4 16.1 4 9.3 8.6 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 42c6 0 10.7-2 14.2-5.4l-6.6-5.4C29.3 33.8 26.8 35 24 35c-6 0-10.7-4.1-12.4-9.6l-6.7 5.2C7.9 37.4 15.3 42 24 42z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 4-5.2 7-11.3 7-6 0-11.1-4-12.8-9.4l-6.7 5.2C7.9 37.4 15.3 42 24 42c10.7 0 19-8.3 19-19 0-1.5-.2-2.9-.4-4.5z" />
  </svg>
);

const FacebookIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
    <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078V12.07h3.047V9.413c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.492 0-1.955.928-1.955 1.88v2.255h3.328l-.532 3.492h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useContext(AuthContext);

  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || "";

  const redirectTo = new URLSearchParams(location.search).get("redirectTo") || "/";

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "email":
        if (!value) error = "El email es requerido.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "El formato del email no es válido.";
        break;
      case "password":
        if (!value) error = "La contraseña es requerida.";
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error, general: "" }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Correr validaciones antes de enviar
    validateField("email", form.email);
    validateField("password", form.password);

    if (errors.email || errors.password || !form.email || !form.password) {
      setErrors(prev => ({ ...prev, general: "Por favor, completa todos los campos correctamente." }));
      return;
    }

    setLoading(true);
    setErrors({}); // Limpia errores antes de la llamada a la API

    try {
      const { data } = await loginApi({ email: form.email, password: form.password });
      
      // Guarda el token y los datos del usuario
      localStorage.setItem("token", data.token);
      setUser(data.user);

      // --- 🔑 LÓGICA PARA LA REDIRECCIÓN BASADA EN ROL ---
      if (data.user.rol === "admin" || data.user.rol === "rrhh") {
        // Si el usuario es admin, lo redirige al dashboard de administrador
        // Para rrhh, el menú correcto se mostrará en el layout.
        navigate("/admin/dashboard");
      } else {
        // Para usuarios normales, lo redirige a donde iba o a una página por defecto
        navigate(redirectTo || "/my-applications");
      }
      
    } catch (err) {
      const apiErrors = err?.response?.data;
      // --- CORRECCIÓN: Manejo del error de cuenta inhabilitada ---
      if (err.response?.status === 403 && apiErrors?.message) {
        setErrors({ general: apiErrors.message });
      }
      else if (apiErrors?.errors) {
        // Si el backend devuelve un array de errores de validación
        const newErrors = {};
        apiErrors.errors.forEach(error => {
          newErrors[error.path] = error.msg;
        });
        setErrors(newErrors);
      } else {
        // Si es un error genérico (401, 500, etc.)
        setErrors({ general: apiErrors?.message || "Email o contraseña incorrectos." });
      }
    } finally {
      setLoading(false);
    }
  };

  const onOAuth = (provider) => {
    // Pasamos redirectTo para que el backend pueda redirigirnos luego del callback
    if (!API_URL) return alert("Falta VITE_API_URL en el .env del front");
    // usamos 'state' para transportar redirectTo
    const url = `${API_URL}/api/auth/${provider}?state=${encodeURIComponent(redirectTo)}`;
    window.location.href = url;
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, borderRadius: 3 }} elevation={4}>
        <form id="login-form" onSubmit={handleSubmit} style={{ width: "100%" }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Bienvenido
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Iniciá sesión para ingresar
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              error={!!errors.email}
              helperText={errors.email}
            />

            <TextField
              label="Contraseña"
              type={showPass ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPass((v) => !v)}
                      edge="end"
                    >
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                />
              }
              label="Recordarme"
            />
          </Stack>

          {errors.general && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {errors.general}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, py: 1.2, fontWeight: 600 }}
          >
            {loading ? "Ingresando..." : "INGRESAR"}
          </Button>

          {/* --- Social logins --- */}
          

          <SocialLogin />

          <Typography align="center" sx={{ mt: 2 }}>
            ¿No tenés cuenta? <a href="/register">Registrate</a>
          </Typography>
        </form>
      </Paper>
    </Container>
  );
}
