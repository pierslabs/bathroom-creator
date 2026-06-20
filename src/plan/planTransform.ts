/**
 * Matemáticas de la planta 2D: encuadre del polígono en el SVG y conversión
 * dominio (metros) <-> píxeles. Puro y testeable; sin React ni DOM.
 */
import type { Point2 } from "../domain/types";

export const PX_W = 300;
export const PX_H = 260;
export const PAD = 28;
export const SNAP = 0.05; // metros: grilla a la que se ajustan las esquinas

export interface Transform {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scale: number;
}

/** Encuadre que hace entrar el polígono en el SVG con padding. */
export function computeTransform(points: Point2[]): Transform {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 0.001);
  const h = Math.max(maxY - minY, 0.001);
  const scale = Math.min((PX_W - 2 * PAD) / w, (PX_H - 2 * PAD) / h);
  return { minX, maxX, minY, maxY, scale };
}

/** Dominio (metros) -> píxeles SVG. Invierte Y: dominio-arriba = pantalla-arriba. */
export function toPx(t: Transform, p: Point2) {
  return {
    x: PAD + (p.x - t.minX) * t.scale,
    y: PAD + (t.maxY - p.y) * t.scale,
  };
}

/** Píxeles SVG -> dominio (metros). Inverso de toPx. */
export function toDomain(t: Transform, px: number, py: number): Point2 {
  return {
    x: t.minX + (px - PAD) / t.scale,
    y: t.maxY - (py - PAD) / t.scale,
  };
}

/** Ajusta un valor en metros a la grilla de SNAP. */
export const snap = (v: number) => Math.round(v / SNAP) * SNAP;
