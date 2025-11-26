import api from "./client";

const API_URL = "/attendance";

// Obtiene el estado actual del usuario (si está fichado o no)
// GET /api/attendance/status
export const getMyCurrentStatusApi = () => {
    return api.get(`${API_URL}/status`);
};

// Registra la entrada del usuario
// POST /api/attendance/clock-in
export const clockInApi = () => {
    return api.post(`${API_URL}/clock-in`);
};

// Registra la salida del usuario, con notas opcionales
// POST /api/attendance/clock-out
export const clockOutApi = (notes) => {
    const payload = notes ? { notes } : {};
    return api.post(`${API_URL}/clock-out`, payload);
};

// Registra la asistencia diaria completa con un solo clic
// POST /api/attendance/submit-daily
export const submitDailyAttendanceApi = () => {
    return api.post(`${API_URL}/submit-daily`);
};