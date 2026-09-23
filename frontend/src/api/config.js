import api from "./client";

export const getConfigApi = (key) => api.get(`/config/${key}`);
export const updateConfigApi = (key, value) => api.patch(`/config/${key}`, { value });
