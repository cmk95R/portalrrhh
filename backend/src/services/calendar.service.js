import { google } from 'googleapis';
import 'dotenv/config';

const CALENDAR_ID_ARGENTINA = 'es.ar#holiday@group.v.calendar.google.com';
const KEYFILEPATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

/**
 * Obtiene los feriados de Argentina para un año específico desde la API de Google Calendar usando OAuth2 con una cuenta de servicio.
 * @param {number} year - El año para el cual obtener los feriados.
 * @returns {Promise<Array<{date: string, name: string}>>} - Un array de objetos con la fecha y el nombre del feriado.
 */
export const getArgentineHolidays = async (year) => {
    if (!KEYFILEPATH) {
        console.error("La ruta al archivo de credenciales de Google (GOOGLE_APPLICATION_CREDENTIALS) no está en las variables de entorno.");
        throw new Error("El servicio de calendario no está configurado.");
    }

    try {
        // Autenticación con la cuenta de servicio
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILEPATH,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });

        const calendar = google.calendar({ version: 'v3', auth });

        const timeMin = `${year}-01-01T00:00:00Z`;
        const timeMax = `${year}-12-31T23:59:59Z`;

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID_ARGENTINA,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });

        // Mapeamos la respuesta para devolver solo los datos que nos interesan
        return (response.data.items || []).map(event => ({
            date: event.start.date, // Formato 'YYYY-MM-DD'
            name: event.summary,
        }));
    } catch (error) {
        console.error("Error al obtener los feriados de Google Calendar:", error.response?.data?.error || error.message);
        throw new Error("No se pudieron obtener los feriados.");
    }
};