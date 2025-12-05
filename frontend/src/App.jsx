import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/home';
import Login from './pages/login';
import Register from './pages/register';
import DashboardLayout from './components/DashboardLayout';
import AdminUsersGrid from './pages/AdminUserGrid';

import Profile from './pages/profile';

import AdminApplicationsPage from './pages/AdminApplicationsPage'; 
import LoginSso from "./pages/LoginSso";
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
        <Route path="/admin/users" element={<AdminUsersGrid />} />
        <Route path="/login/sso" element={<GoogleAuthCallback />} />
        <Route path="/admin/dashboard" element={<Dashboard   />} />
        {/* 👇 AQUÍ APLICAMOS LA PROTECCIÓN 👇 */}
          <Route 
            path="/my-attendance" 
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            } 
          />
        <Route path="/profile" element={<Profile />} />
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="/admin/applications" element={< AdminApplicationsPage />} />
        <Route path="/admin/attendance" element={<AdminAttendancePage />} />
        <Route path="/my-attendance" element={<AttendancePage />} /> {/* <-- 2. Añade la ruta */}
        <Route path="/login/sso" element={<LoginSso />} />
        
      </Route>

      {/* Sin layout (login aparte) */}
                <Route path="/login" element={<Login />} />
    </Routes>
     </ColorModeProvider>
  );
}

export default App;
