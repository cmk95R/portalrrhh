import express from 'express';
import { getHolidays } from '../controllers/holidays.controller.js';

const router = express.Router();

// GET /api/holidays?year=2025
router.get('/', getHolidays);

export default router;