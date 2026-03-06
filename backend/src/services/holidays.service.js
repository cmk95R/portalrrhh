import axios from 'axios';
import { getArgentineHolidays } from './calendar.service.js';

const ARGENTINA_API_BASE = 'https://api.argentinadatos.com/v1/feriados';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/** Cache en memoria: { year: { data: [...], timestamp: number } } */
const cache = new Map();

/**
 * Normaliza la respuesta de la API de Argentina Datos al formato esperado por el frontend.
 * La API puede devolver: { fecha, motivo } o { date, name } u otras variantes.
 * @param {Array} raw - Array de feriados crudos
 * @returns {Array<{date: string, name: string}>}
 */
function normalizeHolidays(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const date = item.fecha || item.date || item.dia;
    const name = item.motivo || item.name || item.nombre || item.tipo || 'Feriado';
    const dateStr = typeof date === 'string' ? date : (date && date.fecha) ? date.fecha : null;
    if (!dateStr) return null;
    return { date: dateStr, name: String(name) };
  }).filter(Boolean);
}

/**
 * Obtiene los feriados de Argentina para un año.
 * 1. Intenta la API de Argentina Datos (api.argentinadatos.com)
 * 2. Si falla, usa el cache del servidor (fallback)
 * 3. Si no hay cache, intenta Google Calendar (fallback secundario)
 *
 * @param {number} year - Año
 * @returns {Promise<Array<{date: string, name: string}>>}
 */
export async function getHolidays(year) {
  const yearNum = parseInt(year, 10);
  const cached = cache.get(yearNum);

  // 1. Intentar API Argentina Datos
  try {
    const url = `${ARGENTINA_API_BASE}/${yearNum}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const raw = Array.isArray(data) ? data : (data?.feriados ?? data?.data ?? []);
    const normalized = normalizeHolidays(raw);

    if (normalized.length > 0) {
      cache.set(yearNum, { data: normalized, timestamp: Date.now() });
      return normalized;
    }
  } catch (err) {
    console.warn('⚠️ API Argentina Datos no disponible, usando fallback:', err?.message || err);
  }

  // 2. Fallback: cache del servidor
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS * 30) {
    return cached.data;
  }

  // 3. Fallback secundario: Google Calendar (si está configurado)
  try {
    const fromGoogle = await getArgentineHolidays(yearNum);
    if (fromGoogle?.length > 0) {
      cache.set(yearNum, { data: fromGoogle, timestamp: Date.now() });
      return fromGoogle;
    }
  } catch (err) {
    console.warn('⚠️ Google Calendar no disponible:', err?.message || err);
  }

  // 4. Último recurso: devolver cache aunque esté viejo
  if (cached) {
    return cached.data;
  }

  return [];
}
