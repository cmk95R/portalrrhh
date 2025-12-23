import api from "./client";

export const getClientsApi = () => api.get("/clients");
export const createClientApi = (data) => api.post("/clients", data);
export const deleteClientApi = (id) => api.delete(`/clients/${id}`);