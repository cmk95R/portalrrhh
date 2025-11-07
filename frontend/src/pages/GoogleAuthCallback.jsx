import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { profileApi } from '../api/auth'; // Tu API para obtener el perfil del usuario
import { Box, CircularProgress, Typography } from '@mui/material'; // Para mostrar un mensaje de carga

export default function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    const handleAuth = async () => {
      // 1. Obtener el token de la URL
      const token = searchParams.get('token');

      if (!token) {
        // Si no hay token, redirigir al login con un error
        navigate('/login?error=auth_failed');
        return;
      }

      // 2. Guardar el token en localStorage
      localStorage.setItem('token', token);

      try {
        // 3. Usar el token para obtener los datos del usuario (incluido el rol)
        const { data } = await profileApi();
        setUser(data.user); // Guardar el usuario en el contexto

        // 4. 🔑 ¡AQUÍ ESTÁ LA LÓGICA DE REDIRECCIÓN!
        if (data.user.rol === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/'); // O a la ruta por defecto para usuarios
        }
      } catch (error) {
        console.error("Error al obtener el perfil después del login con Google", error);
        localStorage.removeItem('token'); // Limpiar token inválido
        navigate('/login?error=profile_fetch_failed');
      }
    };

    handleAuth();
  }, [navigate, searchParams, setUser]);

  // Mientras se procesa, muestra un indicador de carga
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="80vh"
    >
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>Finalizando inicio de sesión...</Typography>
    </Box>
  );
}