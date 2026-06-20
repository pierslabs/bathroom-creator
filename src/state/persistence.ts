/**
 * Persistencia del diseño en localStorage. Solo se guarda el `Design` (que ya
 * es autocontenido: las fotos van como data URLs, no object URLs). La selección
 * y demás estado de UI NO se persiste: es efímero.
 */
import type { Design } from "../domain/types";

const KEY = "bed-creator-design-v1";

/** Lee el diseño guardado, o null si no hay / está corrupto / no hay storage. */
export function loadDesign(): Design | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Design) : null;
  } catch {
    return null;
  }
}

/** Guarda el diseño. Tolera fallos (p. ej. cuota excedida) sin romper la app. */
export function saveDesign(design: Design): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(design));
  } catch (e) {
    console.warn("No se pudo guardar el diseño (¿cuota de localStorage?)", e);
  }
}

/** Borra el diseño guardado. */
export function clearSavedDesign(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // sin storage; nada que limpiar
  }
}
