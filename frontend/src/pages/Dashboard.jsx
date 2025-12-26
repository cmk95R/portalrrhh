import React, { useEffect, useState, useContext } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
  Skeleton,
  Alert,
  CardHeader,
  Chip,
  alpha, // Importante para colores semitransparentes
  useTheme
} from "@mui/material";
import { Link as RouterLink } from 'react-router-dom';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { getDashboardDataApi } from '../api/admin'; // Asegúrate que la ruta a tu API sea correcta
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AuthContext } from '../context/AuthContext';

dayjs.locale('es');

// --- TARJETA DE ESTADÍSTICAS MEJORADA ---
const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card
        sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2.5,
            borderRadius: 4,
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
                transform: 'scale(1.03)',
                boxShadow: '0 8px 30px -4px rgba(0,0,0,0.15)',
            }
        }}
    >
        <Box
            sx={{
                width: 64,
                height: 64,
                mr: 2,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
                color: `${color}.main`,
            }}
        >
            {icon}
        </Box>
        <Box>
            <Typography variant="h4" fontWeight="700">{value}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{title}</Typography>
        </Box>
    </Card>
);

// --- COMPONENTE SKELETON (SIN CAMBIOS SIGNIFICATIVOS) ---
const DashboardSkeleton = () => (
    <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={60} />
        <Grid container spacing={3} mt={1}>
            {Array.from(new Array(4)).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                    <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 4 }} />
                </Grid>
            ))}
            <Grid item xs={12} lg={8}>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
            </Grid>
            <Grid item xs={12} lg={4}>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
            </Grid>
        </Grid>
    </Box>
);

// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
export default function AdminDashboard() {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [clients, setClients] = useState([]);
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [clientDistribution, setClientDistribution] = useState([]);
    const [latestAttendances, setLatestAttendances] = useState([]);
    const [latestUsers, setLatestUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const currentDate = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const theme = useTheme();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError('');
                const { data } = await getDashboardDataApi();
                setStats(data.stats);
                setEmployees(data.employees || []);
                setClients(data.clients || []);
                setAttendanceTrend(data.attendanceTrend || []);
                setClientDistribution(data.clientDistribution || []);
                setLatestAttendances(data.latestAttendances || []);
                setLatestUsers(data.latestUsers || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Error al cargar los datos del dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <DashboardSkeleton />;

    if (error) {
        return <Container maxWidth="lg" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }

    // --- Procesamiento de datos para gráficos ---
    const roleData = employees.reduce((acc, emp) => {
        const role = emp.rol || 'desconocido';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {});

    const pieChartData = Object.keys(roleData).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: roleData[key]
    }));

    const PIE_COLORS = {
        'Empleado': theme.palette.primary.main,
        'Rrhh': theme.palette.info.main,
        'Admin': theme.palette.success.main,
    };

    const processAttendanceTrend = (trendData) => {
        const trendMap = new Map((trendData || []).map(item => [item.date, item.asistencias]));
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = dayjs().subtract(i, 'day');
            const dateKey = date.format('YYYY-MM-DD');
            result.push({
                name: date.format('ddd'), // 'lun', 'mar', etc.
                Asistencias: trendMap.get(dateKey) || 0,
            });
        }
        return result;
    };
    const barChartData = processAttendanceTrend(attendanceTrend);


    return (
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: (theme) => theme.palette.grey[100] }}>
            {/* ENCABEZADO MEJORADO */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">Hola, {user?.nombre} </Typography>
                <Typography variant="body1" color="text.secondary">Hoy es {currentDate}. Aquí tienes un resumen de la actividad.</Typography>
            </Box>
            
            {/* TARJETAS DE ESTADÍSTICAS */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Asistencias Hoy" value={stats.attendanceToday} icon={<CoPresentIcon />} color="success" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Ausentes Hoy" value={stats.absentToday} icon={<PersonOffIcon />} color="error" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Clientes Totales" value={stats.totalClients} icon={<BusinessIcon />} color="info" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Empleados" value={stats.totalUsers} icon={<PeopleIcon />} color="primary" />
                </Grid>
            </Grid>

            {/* SECCIÓN DE GRÁFICOS */}
            <Grid container spacing={3} mb={3}>
                {/* Gráfico de Asistencias */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Asistencias de la Última Semana" />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                                    <YAxis stroke={theme.palette.text.secondary} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: '8px' }} />
                                    <Legend />
                                    <Bar dataKey="Asistencias" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gráfico de Roles */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Distribución de Roles" />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gráfico de Distribución por Cliente */}
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Distribución por Cliente" />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={clientDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" stroke={theme.palette.text.secondary} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={150} stroke={theme.palette.text.secondary} tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: '8px' }} />
                                    <Legend />
                                    <Bar dataKey="value" name="Empleados" fill={theme.palette.secondary.main} radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* SECCIÓN PRINCIPAL */}
            <Grid container spacing={3}>
                {/* ÚLTIMAS ASISTENCIAS */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Últimas Asistencias" />
                        <List sx={{ p: 0 }}>
                            {latestAttendances.map((att, index) => (
                                <React.Fragment key={att._id}>
                                    <ListItem sx={{ py: 1.5, px: 3 }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: att.estado === 'presente' ? 'success.light' : 'error.light', color: att.estado === 'presente' ? 'success.dark' : 'error.dark' }}>
                                                {att.nombre ? att.nombre[0] : 'U'}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body1" fontWeight="500">
                                                    {att.nombre} {att.apellido}
                                                </Typography>
                                            }
                                            secondary={dayjs(att.fecha).format('DD/MM/YYYY')}
                                        />
                                        <Box>
                                            <Chip 
                                                label={att.estado ? att.estado.toUpperCase() : 'N/A'} 
                                                color={att.estado === 'presente' ? 'success' : 'error'} 
                                                size="small" 
                                                variant="outlined"
                                            />
                                        </Box>
                                    </ListItem>
                                    {index < latestAttendances.length - 1 && <Divider component="li" variant="inset" />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Card>
                </Grid>

                {/* LISTA DE EMPLEADOS */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Últimos Usuarios" />
                        <List sx={{ p: 0 }}>
                            {latestUsers.map((user, index) => (
                                <React.Fragment key={user._id}>
                                    <ListItem
                                        sx={{ py: 1.5, px: 3 }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'secondary.light' }}>
                                                {user.nombre ? user.nombre[0] : 'U'}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body1" fontWeight="500">
                                                    {user.nombre} {user.apellido}
                                                </Typography>
                                            }
                                            secondary={user.email}
                                        />
                                        <Box>
                                            <Typography variant="caption" sx={{ bgcolor: 'grey.200', px: 1, py: 0.5, borderRadius: 1 }}>
                                                {user.rol}
                                            </Typography>
                                        </Box>
                                    </ListItem>
                                    {index < latestUsers.length - 1 && <Divider component="li" variant="inset" />}
                                </React.Fragment>
                            ))}
                        </List>
                        <Box sx={{ p: 2, textAlign: 'right' }}>
                            <Button component={RouterLink} to="/admin/users" size="small">Ver Todos</Button>
                        </Box>
                    </Card>
                </Grid>

                {/* ACCIONES RÁPIDAS */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Acciones Rápidas" />
                        <CardContent>
                            <Stack spacing={2}>
                                <Button variant="contained" startIcon={<ManageAccountsIcon />} component={RouterLink} to="/admin/users" size="large" sx={{ justifyContent: 'flex-start', py: 1.5 }}>
                                    Gestionar Empleados
                                </Button>
                                <Button variant="outlined" startIcon={<CoPresentIcon />} component={RouterLink} to="/admin/attendance" size="large" sx={{ justifyContent: 'flex-start', py: 1.5 }}>
                                    Gestionar Asistencias
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
