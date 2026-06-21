/**
 * Geometría DERIVADA del contorno. Funciones puras: entra un Design (o sus
 * puntos), sale un dato. Cero dependencia de Three.js o React — este módulo
 * podría correr en Node, en un worker, o detrás de otro motor de render.
 */
import type { Design, Opening, Point2, TileRegion } from "./types";

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
  tileRegions?: TileRegion[];
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
      tileRegions: w.tileRegions,
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

/** Las dos esquinas (lados opuestos del muro) que confluyen en un vértice. */
export interface Corner {
  /** Lado izquierdo respecto a la dirección de recorrido del contorno. */
  left: Point2;
  /** Lado derecho. */
  right: Point2;
}

/** Intersección de dos rectas P+t·D. Devuelve null si son (casi) paralelas. */
function lineIntersect(
  p1: Point2,
  d1: Point2,
  p2: Point2,
  d2: Point2,
): Point2 | null {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-9) return null; // paralelas / colineales
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

/**
 * Esquinas con inglete (mitre) para cada vértice del contorno.
 *
 * Cada pared es una franja de grosor `thickness[i]` centrada en su arista. En un
 * vértice confluyen dos paredes; sus caras NO se topan a 90°: hay que cortarlas
 * en la bisectriz. Calculamos cada esquina como la intersección de las líneas de
 * borde (la arista desplazada ±grosor/2 perpendicular) de las dos paredes vecinas.
 * Así las esquinas cierran perfecto para cualquier ángulo y grosores distintos.
 *
 * "left"/"right" son consistentes a lo largo del recorrido: forman el contorno
 * interior y el exterior del anillo de muros (cuál es cuál depende de la
 * orientación del polígono, pero da igual para construir la geometría).
 */
export function miterCorners(
  points: Point2[],
  thickness: number[],
): Corner[] {
  const n = points.length;
  // Dirección unitaria y normal izquierda de cada pared k (de points[k] a k+1).
  const dir: Point2[] = [];
  const normL: Point2[] = [];
  for (let k = 0; k < n; k++) {
    const a = points[k];
    const b = points[(k + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    dir.push(d);
    normL.push({ x: -d.y, y: d.x }); // rotar 90° CCW
  }

  return points.map((v, i) => {
    const a = (i - 1 + n) % n; // pared que llega al vértice
    const b = i; // pared que sale del vértice
    const ha = thickness[a] / 2;
    const hb = thickness[b] / 2;

    const side = (sign: 1 | -1): Point2 => {
      // Línea de borde de cada pared, desplazada `sign·grosor/2` perpendicular.
      const pa = {
        x: points[a].x + sign * normL[a].x * ha,
        y: points[a].y + sign * normL[a].y * ha,
      };
      const pb = {
        x: v.x + sign * normL[b].x * hb,
        y: v.y + sign * normL[b].y * hb,
      };
      const hit = lineIntersect(pa, dir[a], pb, dir[b]);
      // Colineales (ángulo llano): no hay codo, vale el offset en el vértice.
      return hit ?? pb;
    };

    return { left: side(1), right: side(-1) };
  });
}

/** El rectángulo de una zona de revestimiento ya recortado a la cara. */
export interface RegionRect {
  /** Inicio a lo largo de la pared (desde start). */
  start: number;
  /** Ancho a lo largo de la pared. */
  width: number;
  /** Base vertical (0 = piso). */
  bottom: number;
  /** Alto. */
  height: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Recorta una zona de revestimiento a los límites reales de la cara de la
 * pared: no puede arrancar fuera, ni sobresalir del largo o de la altura. Así
 * el render nunca dibuja un panel que se salga de la pared.
 */
export function clampRegion(
  region: TileRegion,
  length: number,
  wallHeight: number,
): RegionRect {
  const start = clamp(region.offset, 0, length);
  const bottom = clamp(region.bottom, 0, wallHeight);
  return {
    start,
    width: clamp(region.width, 0, length - start),
    bottom,
    height: clamp(region.height, 0, wallHeight - bottom),
  };
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
