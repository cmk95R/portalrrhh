import React, { useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../api/auth";
import { AuthContext } from "../context/AuthContext";
import {
  Stack,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  InputAdornment,
  Container,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SocialLogin from "../components/socialLogin";
import DireccionAR from "../components/DireccionAR";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [form, setForm] = useState({
    id: "",
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    direccion: { provincia: undefined, localidad: undefined },
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  // --- INICIO: VALIDACIÓN ---
  const [errors, setErrors] = useState({});
  // --- FIN: VALIDACIÓN ---

  // --- INICIO: VALIDACIÓN EN FRONTEND ---
  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "nombre":
        if (!value) error = "El nombre es requerido.";
        else if (value.length < 2) error = "El nombre debe tener al menos 2 caracteres.";
        else if (!/^[a-zA-ZÀ-ÿ\s']+$/.test(value)) error = "El nombre solo puede contener letras y espacios.";
        break;
      case "apellido":
        if (!value) error = "El apellido es requerido.";
        else if (value.length < 2) error = "El apellido debe tener al menos 2 caracteres.";
        else if (!/^[a-zA-ZÀ-ÿ\s']+$/.test(value)) error = "El apellido solo puede contener letras y espacios.";
        break;
      case "email":
        if (!value) error = "El email es requerido.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "El formato del email no es válido.";
        break;
      case "password":
        if (!value) error = "La contraseña es requerida.";
        else if (value.length < 8) error = "La contraseña debe tener al menos 8 caracteres.";
        else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,])/.test(value)) {
          error = "Debe contener mayúscula, minúscula, número y un caracter especial.";
        }
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    // Validar en tiempo real
    validateField(name, value);
  };

  const handleDireccionChange = useCallback(
    (dir) => setForm((p) => ({ ...p, direccion: dir })),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- INICIO: VALIDACIÓN ---
    // Correr todas las validaciones antes de enviar
    const fieldNames = ["nombre", "apellido", "email", "password"];
    fieldNames.forEach(field => validateField(field, form[field]));

    // Comprobar si hay algún error en el estado de errores
    const hasErrors = fieldNames.some(field => !!validateField(field, form[field]) || !!errors[field]);
    if (hasErrors) {
      setErrors(prev => ({ ...prev, general: "Por favor, corrige los errores antes de continuar." }));
      return;
    }
    // --- FIN: VALIDACIÓN ---

    setLoading(true);
    setErrors({}); // Limpiamos errores en cada intento

    try {
      const { data } = await registerApi({
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        password: form.password,
        direccion: form.direccion,
      });
      // Como el registro ya no inicia sesión, mostramos un mensaje y redirigimos a login
      alert(data.message || "Registro exitoso. Ya puedes iniciar sesión.");
      navigate("/login");
    } catch (err) {
      // --- INICIO: VALIDACIÓN ---
      const apiErrors = err?.response?.data;
      if (apiErrors?.errors) {
        // Si el backend devuelve un array de errores, lo procesamos
        const newErrors = {};
        apiErrors.errors.forEach(error => {
          newErrors[error.path] = error.msg;
        });
        setErrors(newErrors);
      } else {
        // Si es un error genérico
        setErrors({ general: apiErrors?.message || "No se pudo registrar" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }} elevation={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Bienvenido
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Registrate para ver nuestras ofertas de empleo
        </Typography>

        <form id="register-form" onSubmit={handleSubmit} style={{ width: "100%" }}>
          <Stack spacing={2}>
            <TextField
              label="Nombre"
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              fullWidth
              error={!!errors.nombre}
              helperText={errors.nombre}
              required
            />

            <TextField
              label="Apellido"
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              fullWidth
              error={!!errors.apellido}
              helperText={errors.apellido}
              required
            />

            <DireccionAR
              value={form.direccion}
              onChange={handleDireccionChange}
              required
            />

            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              error={!!errors.email}
              helperText={errors.email}
              required
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
              required
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
                  checked={form.remember}
                  onChange={handleChange}
                  name="remember"
                />
              }
              label="Recordarme"
            />

            {errors.general && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {errors.general}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              sx={{ mt: 1, py: 1.2, fontWeight: 600 }}
            >
              {loading ? "Registrando..." : "Registrar"}
            </Button>
          </Stack>
        </form>

        <SocialLogin />

        <Typography align="center" sx={{ mt: 2 }}>
          ¿Ya tenés una cuenta? <a href="/login">Iniciá sesión</a>
        </Typography>
      </Paper>
    </Container>
  );
}
