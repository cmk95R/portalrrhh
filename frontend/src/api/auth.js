import api from "./client";

// Llama a POST /api/auth/register
export const registerApi = (payload) => api.post("/auth/register", payload);

// Llama a POST /api/auth/login
export const loginApi = (payload) => api.post("/auth/login", payload);

// Llama a GET /api/auth/me (Endpoint corregido)
export const meApi = () => api.get("/auth/me");

// Puedes mantener profileApi como alias si es necesario por compatibilidad,
// pero es mejor actualizar los componentes para que usen meApi directamente.
export const profileApi = meApi;