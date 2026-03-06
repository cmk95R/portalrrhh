import api from "./client";

const API_URL = "/admin/attendance";

/**
 * Obtiene todos los registros de asistencia con filtros y paginación.
 * @param {object} params - Objeto con parámetros como page, limit, sortBy, etc.
 * @returns {Promise}
 */
export const getAllAttendanceApi = (params) => {
    return api.get(API_URL, { params });
};

/**
 * Obtiene un resumen de asistencias agrupado por usuario.
 * @param {object} params - Objeto con parámetros como page, limit, q, etc.
 * @returns {Promise}
 */
export const getAttendanceSummaryApi = (params) => {
    return api.get(`${API_URL}/summary`, { params });
};

/**
 * Crea un nuevo registro de asistencia manualmente (admin).
 * @param {object} data - Datos del registro a crear (usuario, fecha, estado).
 * @returns {Promise}
 */
export const createAttendanceApi = (data) => {
    return api.post(API_URL, data);
};

export const updateAttendanceApi = (id, data) => {
    return api.patch(`${API_URL}/${id}`, data);
};

export const deleteAttendanceApi = (id) => {
    return api.delete(`${API_URL}/${id}`);
};

/** Empleados activos sin registro de asistencia en la fecha (YYYY-MM-DD). */
export const getWithoutRegistrationApi = (fecha) => {
    return api.get(`${API_URL}/without-registration`, { params: { fecha } });
};

/** Envía recordatorio de asistencia. Opcional: subject, body (texto con {{nombre}}, {{fecha}}, {{fecha_desde}}, {{fecha_hasta}}). */
export const sendAttendanceReminderApi = (fechaDesde, fechaHasta, userIds, options = {}) => {
    return api.post(`${API_URL}/send-reminder`, {
        fechaDesde,
        fechaHasta,
        userIds,
        subject: options.subject,
        body: options.body,
    });
};