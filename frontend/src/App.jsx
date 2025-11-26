import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/home';
import Login from './pages/login';
import Register from './pages/register';
import DashboardLayout from './components/DashboardLayout';
import CVForm from './pages/CVForm' 
import AdminUsersGrid from './pages/AdminUserGrid'; 
import AdminCandidateGrid from './pages/AdminCandidateGrid';
import Profile from './pages/profile';
import AdminSearches from './pages/AdminSearches';
import PublicSearches from "./pages/PublicSearches";
import MyApplications from "./pages/myapplicaction"; 
import AdminApplicationsPage from './pages/AdminApplicationsPage'; 
import LoginSso from "./pages/LoginSso";
import AttendancePage from './pages/AttendancePage'; // <-- 1. Importa la nueva página
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
        <Route path="/CVForm" element={<CVForm />} />
        <Route path="/admin/users" element={<AdminUsersGrid />} />
        <Route path="/login/sso" element={<GoogleAuthCallback />} />
        <Route path="/admin/dashboard" element={<Dashboard   />} />
        <Route path="admin/candidates" element={<AdminCandidateGrid />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="admin/searches" element={<AdminSearches />} />
        <Route path="/searches" element={<PublicSearches />} />
        <Route path="/applications/me" element={<MyApplications />} />
        <Route path="/admin/applications" element={< AdminApplicationsPage />} />
        <Route path="/admin/attendance" element={<AdminAttendancePage />} />
        <Route path="/my-attendance" element={<AttendancePage />} /> {/* <-- 2. Añade la ruta */}
        <Route path="/login/sso" element={<LoginSso />} />
        
      </Route>

      {/* Sin layout (login aparte) */}
     
    </Routes>
     </ColorModeProvider>
  );
}

export default App;
