import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/home';
import Login from './pages/login';
import DashboardLayout from './components/DashboardLayout';
import AdminUsersGrid from './pages/AdminUserGrid';

import Profile from './pages/profile';

import AttendancePage from './pages/AttendancePage'; // <-- 1. Importa la nueva página
import MyRequests from './pages/MyRequests'; // <-- Importamos la página de solicitudes
import ProtectedRoute from './components/ProtectedRoute'; // ¡Importa el nuevo componente!

import GoogleAuthCallback from './pages/GoogleAuthCallback';
import AdminAttendancePage from './pages/AdminAttendancePage';
import RequestsAdmin from './pages/RequestsAdmin';
import ReportsAdmin from './pages/ReportsAdmin';
import CollaboratorsInfo from './pages/CollaboratorsInfo';
import Beneficios from './pages/Beneficios';
import BeneficiosGuard from './components/BeneficiosGuard';
import BeneficioDetalle from './pages/BeneficioDetalle';
import ColorModeProvider from './context/ColorModeProvider'; 

function App() {
  return (
    <ColorModeProvider> 
    <Routes>
      
      {/* Layout con sidebar para páginas internas */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login/sso" element={<GoogleAuthCallback />} />

        {/* --- RUTAS PROTEGIDAS PARA ADMIN Y RRHH --- */}
        {/* Si un empleado intenta entrar aquí, ProtectedRoute lo redirige a /profile */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'rrhh']} />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<AdminUsersGrid />} />
          <Route path="/admin/attendance" element={<AdminAttendancePage />} />
          <Route path="/admin/requests" element={<RequestsAdmin />} />
          <Route path="/admin/reports" element={<ReportsAdmin />} />
          <Route path="/admin/collaborators-info" element={<CollaboratorsInfo />} />
        </Route>

        {/* --- RUTAS PROTEGIDAS GENERALES (Cualquier usuario logueado) --- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-attendance" element={<AttendancePage />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/beneficios" element={<BeneficiosGuard><Beneficios /></BeneficiosGuard>} />
          <Route path="/beneficios/:id" element={<BeneficiosGuard><BeneficioDetalle /></BeneficiosGuard>} />
        </Route>
        
      </Route>

      {/* Sin layout (login aparte) */}
                <Route path="/login" element={<Login />} />

        {/* Catchall: cualquier ruta desconocida redirige al home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
     </ColorModeProvider>
  );
}

export default App;
