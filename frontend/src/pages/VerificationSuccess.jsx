// frontend/src/pages/VerificationSuccess.jsx

import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { CheckCircleOutline as CheckCircleIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export default function VerificationSuccess() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }} elevation={4}>
        <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          ¡Cuenta Verificada!
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Tu dirección de correo electrónico ha sido verificada con éxito. Ya puedes iniciar sesión.
        </Typography>
        <Box>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
          >
            Ir a Iniciar Sesión
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
