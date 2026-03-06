import express from 'express';
import {
    getAllAttendance,
    createAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    getWithoutRegistration,
    sendAttendanceReminder
} from '../controllers/adminAttendance.controller.js';

const router = express.Router();

router.get('/without-registration', getWithoutRegistration);
router.post('/send-reminder', sendAttendanceReminder);
router.get('/', getAllAttendance);
router.post('/', createAttendanceRecord);
router.patch('/:id', updateAttendanceRecord);
router.delete('/:id', deleteAttendanceRecord);


export default router;
