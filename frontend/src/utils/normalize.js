// src/utils/normalize.js
/**
 * Normaliza el input de "direccion" a un formato consistente.
 * Acepta strings, objetos legacy y el formato oficial {id, nombre}.
 * También soporta alias: provinciaId/localidadId, ciudad, address.
 */
export function normalizeDireccion(input) {
  if (!input) return undefined;

  // Si a veces te llega todo dentro de "address"
  const dir = input.address && typeof input.address === 'object' ? input.address : input;

  if (typeof dir === "string") {
    const nombre = dir.trim();
    return nombre ? { localidad: { nombre } } : undefined;
  }

  if (typeof dir === "object" && !Array.isArray(dir)) {
    const out = {};

    // Legacy { ciudad: "Flores" }
    if (typeof dir.ciudad === "string" && dir.ciudad.trim()) {
      out.localidad = { nombre: dir.ciudad.trim() };
    }

    // Soporte alias IDs sueltos
    const provinciaId = dir.provinciaId ?? dir.provincia_id ?? dir.stateId ?? dir.provinceId;
    const localidadId = dir.localidadId ?? dir.localidad_id ?? dir.cityId;

    // Formato oficial/mixto para provincia/localidad (string u objeto)
    ["provincia", "localidad"].forEach((key) => {
      const raw = dir[key];
      if (raw) {
        if (typeof raw === "string" && raw.trim()) {
          out[key] = { nombre: raw.trim() };
        } else if (typeof raw === "object" && (raw.id || raw.nombre)) {
          out[key] = {
            id: raw.id != null ? String(raw.id).trim() : undefined,
            nombre: raw.nombre != null ? String(raw.nombre).trim() : undefined,
          };
        }
      }
    });

    // Completar id si vino en alias suelto
    if (provinciaId != null) {
      out.provincia = { ...(out.provincia || {}), id: String(provinciaId).trim() };
    }
    if (localidadId != null) {
      out.localidad = { ...(out.localidad || {}), id: String(localidadId).trim() };
    }

    // Campos extra opcionales
    ["calle", "numero", "cp", "pais", "piso", "depto"].forEach((k) => {
      if (dir[k] && typeof dir[k] === "string") out[k] = dir[k].trim();
    });

    // Si no quedó nada, undefined
    if (Object.keys(out).length === 0) return undefined;

    return out;
  }

  return undefined;
}
