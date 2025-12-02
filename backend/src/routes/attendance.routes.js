import express from 'express';
import { 
    clockIn, 
    clockOut, 
    getMyAttendance, 
    getMyCurrentStatus, 
    submitDailyAttendance,
    setDailyAttendance,      // <-- 1. Importar la nueva función
    getMyMonthlyAttendance   // <-- 1. Importar la nueva función
} from '../controllers/attendance.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Todas estas rutas requieren que el usuario esté autenticado.
// Aplicamos el middleware a TODAS las rutas de este archivo.
router.use(requireAuth);

// --- Rutas para el calendario de asistencia ---
router.post('/daily', setDailyAttendance);        // <-- 2. Añadir ruta para marcar asistencia diaria
router.get('/monthly', getMyMonthlyAttendance);   // <-- 2. Añadir ruta para obtener asistencias del mes

// --- Rutas existentes para fichaje por hora ---
router.post('/submit-daily', submitDailyAttendance);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);
router.get('/status', getMyCurrentStatus);

export default router;
