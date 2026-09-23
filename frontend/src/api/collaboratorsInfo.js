import api from "./client";

const BASE = "/admin/collaborators-info";

export const listCollaboratorsInfoApi = (params) => api.get(BASE, { params });

export const getCollaboratorInfoApi = (userId) => api.get(`${BASE}/${userId}`);

export const upsertCollaboratorInfoApi = (userId, data) => api.put(`${BASE}/${userId}`, data);

export const uploadCollaboratorPhotoApi = (userId, file) => {
  const formData = new FormData();
  formData.append("foto", file);
  return api.post(`${BASE}/${userId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const exportCollaboratorsListApi = (params) =>
  api.get(`${BASE}/export/list`, { params, responseType: "blob" });
