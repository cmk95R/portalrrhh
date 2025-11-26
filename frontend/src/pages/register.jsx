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
  Grid,
  Box,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SocialLogin from "../components/socialLogin";
import DireccionAR from "../components/DireccionAR";
import { motion } from "framer-motion";

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
    <Container maxWidth="sm" sx={{ py: 6, display: 'flex', alignItems: 'center', minHeight: '50vh' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)" }} elevation={4}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Crear una cuenta
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Únete para descubrir nuevas oportunidades.
            </Typography>
          </Box>

          <form id="register-form" onSubmit={handleSubmit} style={{ width: "100%" }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <TextField label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} fullWidth required error={!!errors.nombre} helperText={errors.nombre} FormHelperTextProps={{ style: { fontSize: '0.70rem' } }} />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6}>
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                  <TextField label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} fullWidth required error={!!errors.apellido} helperText={errors.apellido} FormHelperTextProps={{ style: { fontSize: '0.75rem' } }} />
                </motion.div>
              </Grid>

              <Grid item xs={12}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <DireccionAR value={form.direccion} onChange={handleDireccionChange} required />
                </motion.div>
              </Grid>
              
              </Grid>
              <br />
              <Grid item xs={12} spacing={8}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                  <TextField label="Correo electrónico" type="email" name="email" value={form.email} onChange={handleChange} fullWidth required error={!!errors.email} helperText={errors.email} FormHelperTextProps={{ style: { fontSize: '0.75rem' } }} />
                </motion.div>
              </Grid>
              <br />  
              <Grid item xs={12}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <TextField
                    label="Contraseña"
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!errors.password}
                    helperText={errors.password} FormHelperTextProps={{ style: { fontSize: '0.75rem' } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPass((v) => !v)} edge="end">
                            {showPass ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>
              

              <Grid item xs={12}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                  <FormControlLabel control={<Checkbox checked={form.remember} onChange={handleChange} name="remember" />} label="Recordarme" />
                </motion.div>
              </Grid>

              {errors.general && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {errors.general}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: '100%' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    sx={{ mt: 1, py: 1.5, fontWeight: 600, borderRadius: '8px', textTransform: 'none', fontSize: '1rem' }}
                  >
                    {loading ? "Registrando..." : "Crear Cuenta"}
                  </Button>
                </motion.div>
              </Grid>
            </Grid>
          </form>

          <SocialLogin />

          <Typography align="center" sx={{ mt: 3 }}>
            ¿Ya tenés una cuenta? <a href="/login" style={{ fontWeight: 'bold', textDecoration: 'none' }}>Iniciá sesión</a>
          </Typography>
        </Paper>
      </motion.div>
    </Container>
  );
}
