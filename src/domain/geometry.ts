/**
 * Geometría DERIVADA del contorno. Funciones puras: entra un Design (o sus
 * puntos), sale un dato. Cero dependencia de Three.js o React — este módulo
 * podría correr en Node, en un worker, o detrás de otro motor de render.
 */
import type { Design, Opening, Point2 } from "./types";

/** Una pared ya resuelta a coordenadas: lista para que el render la dibuje. */
export interface WallSegment {
  /** Índice de la pared en el contorno (útil para selección/edición). */
  index: number;
  start: Point2;
  end: Point2;
  height: number;
  thickness: number;
  materialId: string | null;
  openings: Opening[];
  transparent?: boolean;
}

/** Un tramo macizo de pared, en coordenadas LOCALes a la pared (metros). */
export interface WallPart {
  /** Inicio del tramo a lo largo de la pared (desde start). */
  start: number;
  /** Largo del tramo a lo largo de la pared. */
  length: number;
  /** Base vertical del tramo (0 = piso). */
  bottom: number;
  /** Alto del tramo. */
  height: number;
}

/**
 * Deriva un segmento por cada arista del polígono. La pared `i` conecta
 * `points[i]` con `points[i+1]`, y la última cierra contra `points[0]`.
 */
export function wallSegments(design: Design): WallSegment[] {
  const { points, walls } = design;
  const n = points.length;
  return points.map((start, i) => {
    const end = points[(i + 1) % n];
    const w = walls[i];
    return {
      index: i,
      start,
      end,
      height: w.height,
      thickness: w.thickness,
      materialId: w.materialId,
      openings: w.openings,
      transparent: w.transparent,
    };
  });
}

/**
 * Descompone una pared con huecos en los tramos macizos a dibujar.
 * El hueco no se "resta": simplemente NO generamos pared ahí. Una puerta
 * (sill 0) da pilar-izq + dintel + pilar-der; una ventana agrega el antepecho.
 *
 * Coordenadas LOCALes: `start`/`length` corren a lo largo de la pared,
 * `bottom`/`height` son verticales. El render las lleva a mundo.
 */
export function wallParts(
  length: number,
  wallHeight: number,
  openings: Opening[],
): WallPart[] {
  const parts: WallPart[] = [];

  const holes = openings
    .map((o) => ({
      start: Math.max(0, Math.min(o.offset, length)),
      end: Math.max(0, Math.min(o.offset + o.width, length)),
      sill: Math.max(0, o.sill),
      top: Math.min(wallHeight, o.sill + o.height),
    }))
    .filter((o) => o.end > o.start)
    .sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const h of holes) {
    // Pilar macizo de altura completa antes del hueco.
    if (h.start > cursor) {
      parts.push({
        start: cursor,
        length: h.start - cursor,
        bottom: 0,
        height: wallHeight,
      });
    }
    // Antepecho debajo del hueco (ventana).
    if (h.sill > 0) {
      parts.push({
        start: h.start,
        length: h.end - h.start,
        bottom: 0,
        height: h.sill,
      });
    }
    // Dintel encima del hueco.
    if (h.top < wallHeight) {
      parts.push({
        start: h.start,
        length: h.end - h.start,
        bottom: h.top,
        height: wallHeight - h.top,
      });
    }
    cursor = Math.max(cursor, h.end);
  }
  // Pilar macizo final.
  if (cursor < length) {
    parts.push({
      start: cursor,
      length: length - cursor,
      bottom: 0,
      height: wallHeight,
    });
  }

  return parts;
}

/**
 * Área con signo (fórmula del cordón de zapato / shoelace).
 * El signo indica la orientación: negativa = horario, positiva = antihorario.
 */
export function signedArea(points: Point2[]): number {
  const n = points.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Área del piso en m² (siempre positiva). */
export function floorArea(design: Design): number {
  return Math.abs(signedArea(design.points));
}

/** Longitud (en metros) de un segmento de pared. */
export function wallLength(seg: { start: Point2; end: Point2 }): number {
  const dx = seg.end.x - seg.start.x;
  const dy = seg.end.y - seg.start.y;
  return Math.hypot(dx, dy);
}
