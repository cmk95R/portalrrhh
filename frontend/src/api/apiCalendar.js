import api from "./client";

const API_URL = "/holidays";

/**
 * Obtiene los feriados de Argentina para un año específico.
 * @param {number} year - El año para el cual obtener los feriados.
 * @returns {Promise<Array<{date: string, name: string}>>}
 */
export const getHolidaysApi = (year) => {
    return api.get(API_URL, { params: { year } });
};