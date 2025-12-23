import { getArgentineHolidays } from '../services/calendar.service.js';

/**
 * @desc    Obtener los feriados de Argentina para un año dado.
 * @route   GET /api/holidays
 * @access  Public
 */
export const getHolidays = async (req, res, next) => {
    try {
        // Obtenemos el año de la query, o usamos el año actual por defecto.
        const year = req.query.year || new Date().getFullYear();

        const holidays = await getArgentineHolidays(parseInt(year, 10));

        res.status(200).json(holidays);

    } catch (error) {
        // Logueamos el error específico para verlo en la consola de Render
        console.error("❌ Error obteniendo feriados (Google Calendar):", error?.response?.data || error?.message || error);
        next(error);
    }
};