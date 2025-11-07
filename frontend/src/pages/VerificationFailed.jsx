// frontend/src/pages/VerificationFailed.jsx

import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export default function VerificationFailed() {
  const location = useLocation();
  const reason = new URLSearchParams(location.search).get('reason');

  let message = "No pudimos verificar tu cuenta. El enlace puede ser incorrecto.";
  if (reason === 'invalid_or_expired') {
    message = "El enlace de verificación no es válido o ha expirado. Por favor, intenta registrarte de nuevo o solicita un nuevo enlace desde la página de inicio de sesión.";
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }} elevation={4}>
        <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Verificación Fallida
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          {message}
        </Typography>
        <Box>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
          >
            Volver a Inicio de Sesión
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
