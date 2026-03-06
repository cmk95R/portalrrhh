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
  Menu,
  MenuItem,
  alpha, // Importante para colores semitransparentes
  useTheme
} from "@mui/material";
import { Link as RouterLink } from 'react-router-dom';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { getDashboardDataApi } from '../api/admin'; // Asegúrate que la ruta a tu API sea correcta
import { getAllRequestsApi } from '../api/request';
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 4 }} />
                </Grid>
            ))}
            <Grid size={{ xs: 12, lg: 8 }}>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
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
    const [requestStats, setRequestStats] = useState({ total: 0, pendientes: 0, enRevision: 0, pendienteFirma: 0, aprobadas: 0 });
    const [latestRequests, setLatestRequests] = useState([]);
    const [requestTypeChartData, setRequestTypeChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const currentDate = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const theme = useTheme();
    const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
    const actionsMenuOpen = Boolean(actionsAnchorEl);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError('');
                const [dashRes, requestsRes] = await Promise.all([
                    getDashboardDataApi(),
                    getAllRequestsApi({ limit: 50 })
                ]);

                const data = dashRes.data;
                setStats(data.stats);
                setEmployees(data.employees || []);
                setClients(data.clients || []);
                setAttendanceTrend(data.attendanceTrend || []);
                setClientDistribution(data.clientDistribution || []);
                setLatestAttendances(data.latestAttendances || []);
                setLatestUsers(data.latestUsers || []);

                const items = requestsRes.data?.items || [];
                const pendientes = items.filter(r => r.estado === 'pendiente').length;
                const enRevision = items.filter(r => r.estado === 'en_revision').length;
                const pendienteFirma = items.filter(r => r.estado === 'pendiente_firma').length;
                const aprobadas = items.filter(r => r.estado === 'aprobada').length;
                setRequestStats({
                    total: items.length,
                    pendientes,
                    enRevision,
                    pendienteFirma,
                    aprobadas,
                });

                const latest = [...items]
                    .sort((a, b) => new Date(b.createdAt || b.fechaInicio) - new Date(a.createdAt || a.fechaInicio))
                    .slice(0, 5);
                setLatestRequests(latest);

                // Datos para gráfico de tipos de solicitudes
                const typeCounts = items.reduce((acc, r) => {
                    if (!r.tipo) return acc;
                    acc[r.tipo] = (acc[r.tipo] || 0) + 1;
                    return acc;
                }, {});
                const REQUEST_TYPE_LABELS = {
                    vacaciones: 'Vacaciones',
                    dia_estudio: 'Día de Estudio',
                    mudanza: 'Mudanza',
                    maternidad: 'Maternidad',
                    paternidad: 'Paternidad',
                    enfermedad: 'Enfermedad',
                    otro: 'Otro',
                };
                const typeData = Object.entries(typeCounts).map(([tipo, value]) => ({
                    tipo,
                    name: REQUEST_TYPE_LABELS[tipo] || tipo,
                    value,
                }));
                setRequestTypeChartData(typeData);
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
    const pieChartData = [
        { name: 'PRESENTES', value: stats?.attendanceToday || 0 },
        { name: 'AUSENTES', value: stats?.absentToday || 0 }
    ];

    // Paleta de asistencia basada en el azul corporativo #173487
    const PIE_COLORS = {
        PRESENTES: '#173487',  // azul corporativo pleno
        AUSENTES: '#8aaded',   // azul pastel para contraste suave
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

    // Paleta basada en el azul corporativo #173487 (variaciones de tono/luminosidad)
    const REQUEST_TYPE_COLOR_MAP = {
        vacaciones: '#173487',   // azul corporativo base
        dia_estudio: '#2850a4',  // un poco más claro
        enfermedad: '#3b6ac0',   // intermedio, mantiene contraste
        maternidad: '#325fbf',   // ajustado para más contraste
        paternidad: '#4f82d9',   // azul luminoso pero legible
        mudanza: '#6a97e5',      // azul medio
        otro: '#8aaded',         // azul pastel pero más fuerte
    };

    const getRequestTypeLabelUpper = (tipo) => {
        const map = {
            vacaciones: 'Vacaciones',
            dia_estudio: 'Día de Estudio',
            mudanza: 'Mudanza',
            maternidad: 'Maternidad',
            paternidad: 'Paternidad',
            enfermedad: 'Enfermedad',
            otro: 'Otro',
        };
        const label = map[tipo] || tipo || '';
        return label.toUpperCase();
    };


    return (
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: (theme) => theme.palette.grey[100] }}>
            {/* ENCABEZADO MEJORADO */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">Hola, {user?.nombre} </Typography>
                <Typography variant="body1" color="text.secondary">Hoy es {currentDate}. Aquí tienes un resumen de la actividad.</Typography>
                <Box display="flex" alignItems="center" justifyContent="flex-end">
                <Button
                    variant="contained"
                    size="large"
                    
                    
                    sx={{ alignItems: 'flex-end', py: 1.5, minWidth: 220 }}
                    startIcon={<ManageAccountsIcon />}
                    onClick={(e) => setActionsAnchorEl(e.currentTarget)}
                >
                    Acciones rápidas
                </Button>
                <Menu
                    anchorEl={actionsAnchorEl}
                    open={actionsMenuOpen}
                    onClose={() => setActionsAnchorEl(null)}
                >
                    <MenuItem component={RouterLink} to="/admin/users" onClick={() => setActionsAnchorEl(null)}>
                        Gestionar Empleados
                    </MenuItem>
                    <MenuItem component={RouterLink} to="/admin/attendance" onClick={() => setActionsAnchorEl(null)}>
                        Gestionar Asistencias
                    </MenuItem>
                    <MenuItem component={RouterLink} to="/admin/requests" onClick={() => setActionsAnchorEl(null)}>
                        Gestionar Solicitudes
                    </MenuItem>
                </Menu>
                </Box>
                
            </Box>
            
            {/* TARJETAS DE ESTADÍSTICAS */}
            <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Asistencias Hoy" value={stats.attendanceToday} icon={<CoPresentIcon />} color="success" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Ausentes Hoy" value={stats.absentToday} icon={<PersonOffIcon />} color="error" />
                </Grid>
               
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Empleados" value={stats.totalUsers} icon={<PeopleIcon />} color="primary" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Clientes Totales" value={stats.totalClients} icon={<BusinessIcon />} color="info" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Solicitudes Aprobadas" value={requestStats.aprobadas} icon={<AssignmentTurnedInIcon />} color="success" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Solicitudes Pendientes" value={requestStats.pendientes} icon={<HourglassTopIcon />} color="warning" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Solicitudes en Trámite" value={requestStats.enRevision} icon={<AssignmentIcon />} color="info" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard title="Pendientes de Firma" value={requestStats.pendienteFirma} icon={<AssignmentTurnedInIcon />} color="secondary" />
                </Grid>
                
            </Grid>

            {/* SECCIÓN DE GRÁFICOS */}
            <Grid container spacing={3} mb={2}>
                {/* Gráfico de Asistencias */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Asistencias de la Última Semana" />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                                    <YAxis stroke={theme.palette.text.secondary} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: '8px' }} />
                                    <Legend
                                        content={() => (
                                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 14,
                                                        height: 14,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.8),
                                                        borderRadius: 0,
                                                        mr: 1,
                                                    }}
                                                />
                                                <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                                                    Empleados
                                                </Typography>
                                            </Box>
                                        )}
                                    />
                                    <Bar dataKey="Asistencias" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gráfico de Asistencia Hoy */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Estado de Asistencia Hoy" />
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
                                        label={({ name, percent }) => {
                                            const prettyName = name
                                                ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
                                                : '';
                                            return `${prettyName} ${(percent * 100).toFixed(0)}%`;
                                        }}
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend
                                        formatter={(value) =>
                                            value
                                                ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                                                : ''
                                        }
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                {/* Gráfico de Tipos de Solicitudes */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Tipos de Solicitudes" />
                        <CardContent>
                            {requestTypeChartData.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No hay datos de solicitudes para mostrar.
                                </Typography>
                            ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={requestTypeChartData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={110}
                                        labelLine={false}
                                        dataKey="value"
                                    >
                                        {requestTypeChartData.map((entry, index) => {
                                            const baseColor = REQUEST_TYPE_COLOR_MAP[entry.tipo] || theme.palette.primary.main;

                                            // Para "enfermedad" mantenemos color plano (sin degradé)
                                            if (entry.tipo === 'enfermedad') {
                                                return (
                                                    <Cell
                                                        key={`type-cell-${index}`}
                                                        fill={baseColor}
                                                    />
                                                );
                                            }

                                            // Para el resto, aplicamos degradé por posición:
                                            // el último ítem queda más claro, y hacia el primero se intensifica
                                            const total = requestTypeChartData.length || 1;
                                            const t = total > 1 ? (total - 1 - index) / (total - 1) : 1;
                                            const opacity = 0.5 + t * 0.5; // 0.5 (claro pero legible) -> 1 (pleno)

                                            return (
                                                <Cell
                                                    key={`type-cell-${index}`}
                                                    fill={alpha(baseColor, opacity)}
                                                />
                                            );
                                        })}
                                        </Pie>
                                        <Tooltip />
                                        <Legend
                                            formatter={(value) => (
                                                <span style={{ color: theme.palette.primary.main, fontWeight: 400 }}>
                                                    {value}
                                                </span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>                            
                {/* Gráfico de Distribución por Cliente */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Distribución por Cliente" />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    data={clientDistribution}
                                    layout="vertical"
                                    margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                                >
                                    <XAxis type="number" stroke={theme.palette.text.secondary} allowDecimals={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={70}
                                        stroke={theme.palette.text.secondary}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: '8px' }} />
                                    <Legend
                                        formatter={(value) => (
                                            <span style={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                    <Bar dataKey="value" name="Empleados" radius={[0, 4, 4, 0]} barSize={20}>
                                        {clientDistribution.map((entry, index) => {
                                            const total = clientDistribution.length || 1;
                                            const t = total > 1 ? (total - 1 - index) / (total - 1) : 1; // 1 = primer cliente (arriba), 0 = último (abajo)
                                            const opacity = 0.3 + t * 0.7; // de azul muy claro a más intenso
                                            return (    
                                                <Cell
                                                    key={`client-bar-${entry.name}-${index}`}
                                                    fill={alpha(theme.palette.primary.main, opacity)}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                
            </Grid>

            {/* SECCIÓN PRINCIPAL */}
            <Grid container spacing={3}>

                  {/* Sección de Últimas Solicitudes */}
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Últimas Solicitudes" />
                        <List sx={{ p: 0 }}>
                            {latestRequests.length === 0 ? (
                                <Box sx={{ py: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No hay solicitudes registradas recientemente.
                                    </Typography>
                                </Box>
                            ) : (
                                latestRequests.map((req, index) => (
                                    <React.Fragment key={req._id}>
                                        <ListItem sx={{ py: 1.5, px: 3 }}>
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                                                    {req.usuario?.nombre ? req.usuario.nombre[0] : 'U'}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body1" fontWeight="500">
                                                        {req.usuario?.nombre} {req.usuario?.apellido}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {dayjs(req.fechaInicio).format('DD/MM/YYYY')} · {getRequestTypeLabelUpper(req.tipo)}
                                                        </Typography>
                                                        <Chip
                                                            label={req.estado.replace('_', ' ').toUpperCase()}
                                                            size="small"
                                                            color={req.estado === 'pendiente' ? 'warning' :
                                                                req.estado === 'en_revision' ? 'info' :
                                                                req.estado === 'pendiente_firma' ? 'secondary' :
                                                                req.estado === 'aprobada' ? 'success' : 'default'}
                                                            sx={{ mt: 0.5 }}
                                                        />
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                        {index < latestRequests.length - 1 && <Divider component="li" variant="inset" />}
                                    </React.Fragment>
                                ))
                            )}
                        </List>
                        <Box sx={{ p: 2, textAlign: 'right' }}>
                            <Button component={RouterLink} to="/admin/requests" size="small">
                                Ver todas las solicitudes
                            </Button>
                        </Box>
                    </Card>
                </Grid>
                {/* ÚLTIMAS ASISTENCIAS */}
                <Grid size={{ xs: 12, md: 4  }}>
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
                <Grid size={{ xs: 12, lg: 4 }}>
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

              

            </Grid>
                
            

            
        </Box>
    );
}
