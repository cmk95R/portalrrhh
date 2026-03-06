import { getHolidays as fetchHolidays } from '../services/holidays.service.js';

/**
 * @desc    Obtener los feriados de Argentina para un año dado.
 *         Usa API Argentina Datos con cache en servidor; fallback a cache o Google Calendar.
 * @route   GET /api/holidays?year=2026
 * @access  Public
 */
export const getHolidays = async (req, res, next) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const holidays = await fetchHolidays(parseInt(year, 10));
        res.status(200).json(holidays);
    } catch (error) {
        console.error("❌ Error obteniendo feriados:", error?.response?.data || error?.message || error);
        next(error);
    }
};