/**
 * Convención de coordenadas, en UN solo lugar.
 *
 * El dominio es 2D top-down: (x, y). El mundo 3D usa `y` como ALTURA, así que
 * la planta vive en el plano XZ con z = -y. Antes esta conversión estaba
 * repetida (y fácil de desincronizar) en Walls, Floor y CatalogPanel.
 */
import type { Point2 } from "../domain/types";

/** Punto de planta (x, y) -> coordenadas de mundo en el plano del piso [x, z]. */
export function toWorldXZ(p: Point2): [number, number] {
  return [p.x, -p.y];
}
