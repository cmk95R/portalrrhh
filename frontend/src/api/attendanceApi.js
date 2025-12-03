import api from "./client";

const API_URL = "/attendance";

/**
 * Obtiene el estado de asistencia del usuario para el día actual.
 * @returns {Promise<{status: string, record: object}>}
 */
export const getMyCurrentStatusApi = () => {
    return api.get(`${API_URL}/status`);
};

/**
 * Registra la hora de entrada del usuario (fichaje manual).
 * @returns {Promise}
 */
export const clockInApi = () => {
    return api.post(`${API_URL}/clock-in`);
};

/**
 * Registra la hora de salida del usuario (fichaje manual).
 * @param {string} [notes] - Notas opcionales para el registro.
 * @returns {Promise}
 */
export const clockOutApi = (notes) => {
    const payload = notes ? { notes } : {};
    return api.post(`${API_URL}/clock-out`, payload);
};

/**
 * Registra la asistencia del día completo con un solo clic (auto-generado).
 * @returns {Promise}
 */
export const submitDailyAttendanceApi = () => {
    return api.post(`${API_URL}/submit-daily`);
};

/**
 * Marca la asistencia de un día específico como 'presente' o 'ausente'.
 * @param {{ fecha: string, estado: 'presente' | 'ausente' }} data - La fecha y el estado.
 * @returns {Promise}
 */
export const setDailyAttendanceApi = (data) => {
    return api.post(`${API_URL}/daily`, data);
};

/**
 * Obtiene todos los registros de asistencia del usuario para un mes y año específicos.
 * @param {{ month: number, year: number }} params - El mes (1-12) y el año.
 * @returns {Promise<Array<object>>}
 */
export const getMyMonthlyAttendanceApi = (params) => {
    return api.get(`${API_URL}/monthly`, { params });
};

/**
 * Actualiza un registro de asistencia existente por su ID.
 * @param {string} id - El ID del registro de asistencia.
 * @param {object} data - Los campos a actualizar (ej. { horasExtras: 2, guardia: 'activa' }).
 * @returns {Promise}
 */
export const updateMyAttendanceApi = (id, data) => {
    return api.patch(`${API_URL}/${id}`, data);
};