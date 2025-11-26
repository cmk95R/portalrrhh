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

export const updateAttendanceApi = (id, data) => {
    return api.patch(`${API_URL}/${id}`, data);
};

export const deleteAttendanceApi = (id) => {
    return api.delete(`${API_URL}/${id}`);
};