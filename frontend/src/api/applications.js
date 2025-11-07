// frontend/src/api/applications.js

import api from "./client";

export const applyToSearchApi = (id, payload) =>
  api.post(`/searches/${id}/apply`, payload);

export const myApplicationsApi = () =>
  api.get("/applications/me");

// ⬇️ Aceptar params de filtro para admin
export const listApplicationsApi = (params = {}) =>
  api.get("/admin/applications", { params });

export const updateApplicationApi = (id, payload) =>
  api.patch(`/admin/applications/${id}`, payload);

export const withdrawApplicationApi = (id) => 
  api.delete(`/applications/${id}`);
/**
 * Elimina (retira) una postulación específica por su ID.
 * @param {string} applicationId - El ID de la postulación a retirar.
 */

/**
 * Obtiene la URL de descarga del CV para una postulación específica (Admin).
 * @param {string} applicationId - El ID de la postulación.
 */
export const getApplicationCvDownloadUrlApi = (applicationId) =>
  api.get(`/admin/applications/${applicationId}/cv/download`);
