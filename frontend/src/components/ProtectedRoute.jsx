import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // Mientras se verifica el estado de autenticación, mostramos un spinner.
  // Esto previene que se redirija al login brevemente al recargar la página.
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verificando sesión...</Typography>
      </Box>
    );
  }

  // Si la carga terminó y NO hay usuario, redirigimos a la página de login.
  // Guardamos la ruta original para que, después de iniciar sesión, el usuario sea redirigido de vuelta.
  if (!user) {
    return <Navigate to={`/login?redirectTo=${location.pathname}`} replace />;
  }

  // Si la carga terminó y SÍ hay un usuario, mostramos el contenido protegido.
  return children;
};

export default ProtectedRoute;