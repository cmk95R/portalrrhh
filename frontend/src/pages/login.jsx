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
  Alert,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { loginApi } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useContext(AuthContext);

  const [form, setForm] = useState({ dni: "", pin: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState({});

  const redirectTo =
    new URLSearchParams(location.search).get("redirectTo") || "/";

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
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, borderRadius: 3 }} elevation={4}>
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
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, py: 1.2, fontWeight: 600 }}
          >
            {loading ? "Ingresando..." : "INGRESAR"}
          </Button>

          <Typography align="center" sx={{ mt: 2 }} variant="body2">
            ¿Problemas para ingresar? Contactá con RRHH o tu administrador.
          </Typography>
        </form>
      </Paper>
    </Container>
  );
}
