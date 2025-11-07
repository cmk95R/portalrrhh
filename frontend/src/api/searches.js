// frontend/src/api/searches.js
import api from "./client";

// Admin (requiere rol admin)
export const listSearchesApi  = (params)      => api.get("/admin/searches", { params });
export const createSearchApi  = (payload)     => api.post("/admin/searches", payload);
export const updateSearchApi  = (id, payload) => api.patch(`/admin/searches/${id}`, payload);
export const deleteSearchApi  = (id)          => api.delete(`/admin/searches/${id}`);

// Público (si lo usás en otra vista)
export const listPublicSearchesApi = (params) => api.get("/searches", { params });
export const getPublicSearchApi    = (id)     => api.get(`/searches/${id}`);
