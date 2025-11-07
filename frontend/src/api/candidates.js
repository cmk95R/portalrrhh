import api from "./client";

/**
 * Admin: Lista todos los CVs (candidatos).
 * Calls GET /api/admin/cvs
 */
export const listCandidatesApi = (params = {}) => api.get("/admin/cvs", { params }); // Added params for potential filtering

/**
 * Admin: Elimina un CV específico por su ID.
 * Calls DELETE /api/admin/cvs/:id
 * (Asegúrate de que esta ruta y controlador existan en el backend)
 */
export const deleteCandidateApi = (id) => api.delete(`/admin/cvs/${id}`);