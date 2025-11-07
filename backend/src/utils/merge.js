// src/utils/merge.js (o donde prefieras)
import { normalizeDireccion } from "./normalize";

export function mergeDireccion(cvDir, userDir) {
  const a = normalizeDireccion(cvDir);
  const b = normalizeDireccion(userDir);
  if (!a && !b) return undefined;
  return {
    ...(a || {}),
    ...(b || {}),
    provincia: { ...(a?.provincia || {}), ...(b?.provincia || {}) },
    localidad: { ...(a?.localidad || {}), ...(b?.localidad || {}) },
  };
}
