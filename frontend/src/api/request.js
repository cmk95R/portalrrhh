import api from "./client";

const API_URL = "/requests";

// Empleado
export const createRequestApi = (data, config) => api.post(API_URL, data, config);
export const getMyRequestsApi = () => api.get(`${API_URL}/me`);
export const editRequestApi = (id, data, config) => api.put(`${API_URL}/${id}`, data, config);
export const deleteRequestApi = (id) => api.delete(`${API_URL}/${id}`);
export const getRequestFileApi = (fileId) => api.get(`${API_URL}/file/${fileId}`, { responseType: 'blob' });
export const getRequestCommentsApi = (id) => api.get(`${API_URL}/${id}/comments`);
export const postRequestCommentApi = (id, data) => api.post(`${API_URL}/${id}/comments`, data);

// Admin / RRHH
export const getAllRequestsApi = (params) => api.get(`/admin${API_URL}`, { params });
export const adminCreateRequestApi = (data, config) => api.post(`/admin${API_URL}`, data, config);
export const updateRequestStatusApi = (id, data, config) => api.patch(`/admin${API_URL}/${id}/status`, data, config);
export const adminUpdateRequestApi = (id, data) => api.put(`/admin${API_URL}/${id}`, data);
export const adminDeleteRequestApi = (id) => api.delete(`/admin${API_URL}/${id}`);
export const getAdminRequestCommentsApi = (id) => api.get(`/admin${API_URL}/${id}/comments`);
export const postAdminRequestCommentApi = (id, data) => api.post(`/admin${API_URL}/${id}/comments`, data);
export const sendRequestReminderApi = (id) => api.post(`/admin${API_URL}/${id}/send-reminder`);
