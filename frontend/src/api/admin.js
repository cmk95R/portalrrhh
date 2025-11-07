// frontend/src/api/admin.js
import api from "./client";

// Calls GET /api/admin/dashboard
export const getDashboardDataApi = () => api.get("/admin/dashboard");