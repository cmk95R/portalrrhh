// frontend/src/api/cv.js
import api from "./client";

/**
 * Obtiene el CV del usuario actualmente logueado.
 */
export const getMyCvApi = () => api.get("/cv/me");

/**
 * Crea o actualiza el CV del usuario enviando datos y un archivo.
 * Usa FormData, ideal para subir archivos.
 * @param {FormData} formData - El objeto FormData que contiene los datos del CV y el archivo PDF.
 */
export const upsertMyCv = (formData) => {
  // No se especifica el header 'Content-Type'. 
  // Axios (o el cliente que uses) lo hará automáticamente al detectar FormData.
  return api.post("/cv/me", formData);
};

/**
 * Crea o actualiza el CV del usuario enviando solo datos en formato JSON.
 * @param {object} payload - El objeto con los datos del CV.
 */
export const upsertMyCvJson = (payload) => api.post("/cv/me", payload);

export const getMyCvDownloadUrlApi = () => api.get("/cv/me/download");