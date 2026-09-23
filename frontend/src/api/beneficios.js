import api from "./client";

const BASE = "/beneficios";

export const listBeneficiosApi = (params) => api.get(BASE, { params });

export const getBeneficioApi = (id) => api.get(`${BASE}/${id}`);

export const listCategoriasBeneficiosApi = () => api.get(`${BASE}/categorias`);
