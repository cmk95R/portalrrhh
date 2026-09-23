import { useContext, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getConfigApi } from '../api/config';
import SpinnerAsytec from './SpinnerAsytec';

export default function BeneficiosGuard({ children }) {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [publicos, setPublicos] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfigApi('beneficios_publicos')
      .then(({ data }) => setPublicos(data?.value === true))
      .catch(() => setPublicos(false))
      .finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) return <SpinnerAsytec fullscreen />;

  if (!publicos && user?.rol === 'empleado') {
    return <Navigate to="/" replace />;
  }

  return children;
}
