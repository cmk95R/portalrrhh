import api from "./client";

const BASE = "/admin/reports";

/** @param {Record<string, unknown>} params */
export const getAttendanceReportApi = (params) => api.get(`${BASE}/attendance`, { params });

/** @param {Record<string, unknown>} params */
export const getAttendanceReportSummaryApi = (params) =>
  api.get(`${BASE}/attendance/summary`, { params });

/**
 * @param {Record<string, unknown>} params Incluye `format`: csv | xlsx | pdf
 */
export const exportAttendanceReportApi = (params) =>
  api.get(`${BASE}/attendance/export`, { params, responseType: "blob" });

/** @param {Record<string, unknown>} params */
export const getRequestReportApi = (params) => api.get(`${BASE}/requests`, { params });

/** @param {Record<string, unknown>} params */
export const getRequestReportSummaryApi = (params) => api.get(`${BASE}/requests/summary`, { params });

/**
 * @param {Record<string, unknown>} params Incluye `format`: csv | xlsx | pdf
 */
export const exportRequestReportApi = (params) =>
  api.get(`${BASE}/requests/export`, { params, responseType: "blob" });
