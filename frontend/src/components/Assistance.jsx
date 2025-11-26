import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    Card,
    Typography,
    Button,
    CircularProgress,
    Stack,
    Alert,
    Snackbar,
    Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// --- Iconos ---
import SendIcon from '@mui/icons-material/Send';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LoginIcon from '@mui/icons-material/Login'; // Icono para la entrada
import LogoutIcon from '@mui/icons-material/Logout'; // Icono para la salida
import { Paper } from '@mui/material';

// APIs y Contexto
import { getMyCurrentStatusApi, submitDailyAttendanceApi } from '../api/attendanceApi';
import { AuthContext } from '../context/AuthContext';

// --- Componentes de Estilo Inspirados en tu Diseño ---

const StyledCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: theme.spacing(6),
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    textAlign: 'center',
    maxWidth: 600,
    width: '100%',
    transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease',
    '&:hover': {
        transform: 'translateY(-10px) scale(1.02)',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.2)',
    },
    [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(4),
    },
}));

const MotionStyledCard = motion(StyledCard);

// --- Variantes de Animación ---
const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'tween',      // Cambiado a 'tween' para un control de duración directo
            duration: 0.4,      // Duración más corta para una entrada rápida
            when: "beforeChildren",
            staggerChildren: 0.1, // Los elementos internos aparecen más rápido
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const submittedItemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 15 } }
};

const timeCardHover = {
    y: -5,
    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
};

const GradientButton = styled(Button)(({ theme }) => ({
    padding: '15px 40px',
    fontSize: '1.1rem',
    fontWeight: 500,
    borderRadius: '30px',
    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    '&:hover': {
        background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
        transform: 'translateY(-3px) scale(1.05)',
        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
    },
    '&:disabled': {
        background: theme.palette.grey[400],
    }
}));

// --- Componente Principal ---

export default function AssistanceWidget() {
    const { user } = useContext(AuthContext);
    const [status, setStatus] = useState('loading'); // 'loading', 'initial', 'sending', 'submitted', 'error'
    const [submittedRecord, setSubmittedRecord] = useState(null);
    const [error, setError] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            setStatus('loading');
            const { data } = await getMyCurrentStatusApi();
            if (data.status === 'clocked-in') {
                setStatus('submitted');
                setSubmittedRecord(data.record);
            } else {
                setStatus('initial');
            }
        } catch (e) {
            setStatus('error');
            setError(e.response?.data?.message || 'Error al cargar el estado.');
        }
    }, []); // No necesita dependencias

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleSubmitAttendance = async () => {
        setStatus('sending');
        setError('');
        try {
            await submitDailyAttendanceApi();
            setSnackbarOpen(true);
            await fetchStatus();
        } catch (e) {
            setError(e.response?.data?.message || 'No se pudo enviar la asistencia.');
            setStatus('initial'); // Vuelve al estado inicial si hay error
        }
    };

    return (
        <>
            <MotionStyledCard variants={cardVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                    <Typography variant="h4" component="h1" fontWeight="700" color="primary.main" display="flex" alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
                        <ScheduleIcon sx={{ fontSize: '2.8rem', mr: 1.5 }} />
                        Registro de Asistencia
                    </Typography>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Hola {user?.nombre}, ¡que tengas una excelente jornada!
                    </Typography>
                </motion.div>

                <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        {status === 'loading' && <CircularProgress />}

                        {(status === 'initial' || status === 'sending') && (
                            <motion.div key="initial" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
                                {status === 'sending' ? (
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <CircularProgress size={24} />
                                        <Typography>Enviando...</Typography>
                                    </Stack>
                                ) : (
                                    <GradientButton
                                        component={motion.button}
                                        whileHover={{ scale: 1.05, y: -3 }}
                                        whileTap={{ scale: 0.95 }}
                                        startIcon={<SendIcon />}
                                        onClick={handleSubmitAttendance}
                                        disabled={status === 'sending'}
                                    >
                                        Enviar Asistencia
                                    </GradientButton>
                                )}
                            </motion.div>
                        )}

                        {status === 'submitted' && submittedRecord && (
                            <motion.div key="submitted" variants={cardVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
                                <Stack spacing={2} alignItems="center">
                                    <motion.div variants={submittedItemVariants}>
                                        <CheckCircleOutlineIcon sx={{ fontSize: '5rem', color: 'success.main' }} />
                                    </motion.div>
                                    <motion.div variants={submittedItemVariants} style={{ width: '100%' }}>
                                        <Alert
                                        severity="success"
                                        variant="standard"
                                        sx={{
                                            background: 'linear-gradient(45deg, #e8f5e8 30%, #c8e6c9 90%)',
                                            color: '#2e7d32',
                                            borderRadius: '12px',
                                            fontSize: '1.1rem',
                                            fontWeight: 500,
                                            borderLeft: '5px solid #4caf50',
                                        }}
                                    >
                                        ¡Asistencia registrada exitosamente!
                                        </Alert>
                                    </motion.div>
                                    {/* --- SECCIÓN MEJORADA VISUALMENTE --- */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center" sx={{ pt: 1 }}>
                                        <motion.div variants={submittedItemVariants} whileHover={timeCardHover}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', width: 160 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Entrada</Typography>
                                                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                                    <LoginIcon color="success" />
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {new Date(submittedRecord.clockInTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                    </Typography>
                                                </Stack>
                                            </Paper>
                                        </motion.div>
                                        <motion.div variants={submittedItemVariants} whileHover={timeCardHover}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', width: 160 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Salida (Est.)</Typography>
                                                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                                    <LogoutIcon color="error" />
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {new Date(submittedRecord.clockOutTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs
                                                    </Typography>
                                                </Stack>
                                            </Paper>
                                        </motion.div>
                                    </Stack>
                                </Stack>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>

                {error && <Alert severity="error" sx={{ mt: 3, justifyContent: 'center' }}>{error}</Alert>}

                <motion.div variants={itemVariants}>
                    <Box sx={{ mt: 5, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                        © {new Date().getFullYear()} Sistema de Registro de Asistencia.
                    </Typography>
                    </Box>
                </motion.div>
            </MotionStyledCard>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                message="Asistencia enviada correctamente"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
}