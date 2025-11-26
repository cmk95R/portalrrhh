import express from 'express';
import { clockIn, clockOut, getMyAttendance, getMyCurrentStatus, submitDailyAttendance } from '../controllers/attendance.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Todas estas rutas requieren que el usuario esté autenticado.
// Aplicamos el middleware a TODAS las rutas de este archivo.
router.use(requireAuth);

router.post('/submit-daily', submitDailyAttendance); // <-- NUEVA RUTA
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);
router.get('/status', getMyCurrentStatus);

export default router;
