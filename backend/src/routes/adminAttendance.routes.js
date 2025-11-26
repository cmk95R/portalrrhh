import express from 'express';
import {
    getAllAttendance,
    createAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord
} from '../controllers/adminAttendance.controller.js';

// Los middlewares de autenticación y rol ya se aplican en 'adminRoutes.js'
// por lo que no es necesario volver a ponerlos aquí.

const router = express.Router();

router.get('/', getAllAttendance);
router.post('/', createAttendanceRecord);
router.patch('/:id', updateAttendanceRecord);
router.delete('/:id', deleteAttendanceRecord);


export default router;
