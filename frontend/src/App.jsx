import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/home';
import Login from './pages/login';
import Register from './pages/register';
import DashboardLayout from './components/DashboardLayout';
import AdminUsersGrid from './pages/AdminUserGrid';

import Profile from './pages/profile';

import AttendancePage from './pages/AttendancePage'; // <-- 1. Importa la nueva página
import ProtectedRoute from './components/ProtectedRoute'; // ¡Importa el nuevo componente!

import GoogleAuthCallback from './pages/GoogleAuthCallback';
import AdminAttendancePage from './pages/AdminAttendancePage';
import ColorModeProvider from './context/ColorModeProvider'; 

function App() {
  return (
    <ColorModeProvider> 
    <Routes>
      
      {/* Layout con sidebar para páginas internas */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login/sso" element={<GoogleAuthCallback />} />

        {/* --- RUTAS PROTEGIDAS PARA ADMIN Y RRHH --- */}
        {/* Si un empleado intenta entrar aquí, ProtectedRoute lo redirige a /profile */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'rrhh']} />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<AdminUsersGrid />} />
          <Route path="/admin/attendance" element={<AdminAttendancePage />} />
        </Route>

        {/* --- RUTAS PROTEGIDAS GENERALES (Cualquier usuario logueado) --- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-attendance" element={<AttendancePage />} />
        </Route>
        
      </Route>

      {/* Sin layout (login aparte) */}
                <Route path="/login" element={<Login />} />
    </Routes>
     </ColorModeProvider>
  );
}

export default App;
