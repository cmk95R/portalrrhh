//frontend/src/api/apiGeo.js
import api from "../api/client"; // Importamos nuestro cliente de API

// --- Funciones de API locales ---
export const getProvinciasApi = () => api.get("/geo/provincias");
export const getLocalidadesApi = (provinciaId) => api.get(`/geo/localidades?provinciaId=${provinciaId}`);

