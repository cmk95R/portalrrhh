import React, { useEffect, useState } from 'react';
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
    alpha // Importante para colores semitransparentes
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import RateReviewIcon from '@mui/icons-material/RateReview';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import { getDashboardDataApi } from '../api/admin'; // Asegúrate que la ruta a tu API sea correcta

// --- FUNCIÓN HELPER PARA TIEMPO RELATIVO ---
function formatTimeAgo(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `hace ${seconds} seg`;
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${days} días`;
}

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
                <Grid item xs={12} sm={6} md={3} key={index}>
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
    const [stats, setStats] = useState(null);
    const [recentApplications, setRecentApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const currentDate = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError('');
                const { data } = await getDashboardDataApi();
                setStats(data.stats);
                setRecentApplications(data.recentApplications);
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

    return (
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: (theme) => theme.palette.grey[100] }}>
            {/* ENCABEZADO MEJORADO */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">Hola, Admin 👋</Typography>
                <Typography variant="body1" color="text.secondary">Hoy es {currentDate}. Aquí tienes un resumen de la actividad.</Typography>
            </Box>

            {/* TARJETAS DE ESTADÍSTICAS */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Postulaciones (últ. 7 días)" value={stats.newApplications} icon={<RateReviewIcon />} color="primary" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Búsquedas Activas" value={stats.activeSearches} icon={<WorkIcon />} color="success" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="CVs Pendientes" value={stats.pendingApplications} icon={<VisibilityIcon />} color="warning" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Candidatos Totales" value={stats.totalUsers} icon={<PeopleIcon />} color="info" />
                </Grid>
            </Grid>

            {/* SECCIÓN PRINCIPAL */}
            <Grid container spacing={3}>
                {/* ÚLTIMAS POSTULACIONES */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Actividad Reciente" />
                        <List sx={{ p: 0 }}>
                            {recentApplications.map((app, index) => (
                                <React.Fragment key={app._id}>
                                    <ListItem
                                        button
                                        // --- CORRECCIÓN: Añadir comprobación para el enlace ---
                                        component={app.user ? RouterLink : 'div'} // Usar 'div' si el usuario no existe para que no sea un enlace roto
                                        to={app.user ? `/admin/applications?q=${app.user.nombre}` : undefined}
                                        sx={{ py: 1.5, px: 3 }}
                                    >
                                        <ListItemAvatar>
                                            {/* --- CORRECCIÓN: Comprobación para el Avatar --- */}
                                            <Avatar sx={{ bgcolor: 'secondary.light' }}>
                                                {app.user ? `${app.user.nombre[0]}${app.user.apellido[0]}` : 'X'}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            // --- CORRECCIÓN: Comprobación para el texto principal y secundario ---
                                            primary={
                                                <Typography variant="body1" fontWeight="500">
                                                    {app.user ? `${app.user.nombre} ${app.user.apellido}` : 'Usuario Eliminado'}
                                                </Typography>
                                            }
                                            secondary={`Se postuló a ${app.search ? app.search.titulo : 'una búsqueda eliminada'}`}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            {formatTimeAgo(app.createdAt)}
                                        </Typography>
                                    </ListItem>
                                    {index < recentApplications.length - 1 && <Divider component="li" variant="inset" />}
                                </React.Fragment>
                            ))}
                        </List>
                        <Box sx={{ p: 2, textAlign: 'right' }}>
                            <Button component={RouterLink} to="/admin/applications" size="small">Ver Todas</Button>
                        </Box>
                    </Card>
                </Grid>

                {/* ACCESOS DIRECTOS */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}>
                        <CardHeader titleTypographyProps={{ fontWeight: 'bold' }} title="Acciones Rápidas" />
                        <CardContent>
                            <Stack spacing={2}>
                                <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/admin/searches/" size="large" sx={{ justifyContent: 'flex-start', py: 1.5 }}>
                                    Crear Nueva Búsqueda
                                </Button>
                                <Button variant="outlined" startIcon={<ArticleIcon />} component={RouterLink} to="/admin/applications" size="large" sx={{ justifyContent: 'flex-start', py: 1.5 }}>
                                    Gestionar Postulaciones
                                </Button>
                                <Button variant="outlined" startIcon={<PeopleIcon />} component={RouterLink} to="/admin/candidates" size="large" sx={{ justifyContent: 'flex-start', py: 1.5 }}>
                                    Ver Candidatos
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}