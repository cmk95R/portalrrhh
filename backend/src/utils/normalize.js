// src/utils/normalize.js

/**
 * Normaliza el input de "direccion" a un formato consistente,
 * aceptando provincia como objeto y localidad como string.
 */
export function normalizeDireccion(input) {
  if (!input || typeof input !== "object") return undefined;

  const out = {};
  
  // --- PROVINCIA (Objeto) ---
  // Mantiene la lógica para procesar el objeto provincia
  if (input.provincia && (input.provincia.id || input.provincia.nombre)) {
    out.provincia = {
      id: input.provincia.id ? String(input.provincia.id) : undefined,
      nombre: input.provincia.nombre ? String(input.provincia.nombre) : undefined
    };
  }
  
  // --- LOCALIDAD (String) ---
  // Acepta la localidad si es un string y no está vacío
  if (input.localidad && typeof input.localidad === 'string' && input.localidad.trim()) {
    out.localidad = input.localidad.trim();
  }
  
  // --- OTROS CAMPOS ---
  // Se asegura de pasar también los otros campos de dirección
  if (input.calle) out.calle = String(input.calle).trim();
  if (input.numero) out.numero = String(input.numero).trim();
  if (input.cp) out.cp = String(input.cp).trim();
  if (input.pais) out.pais = String(input.pais).trim();
  
  // Si no quedó nada, undefined
  if (Object.keys(out).length === 0) return undefined;

  return out;
}