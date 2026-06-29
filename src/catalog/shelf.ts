/**
 * Layout interior de una estantería / mueble auxiliar: carcasa hueca con baldas.
 * Lógica PURA: entra el tamaño, sale dónde van las baldas y si hay divisor. Sin
 * Three ni React — testeable sola.
 *
 * Convención clave (igual que el resto del catálogo): la geometría se dibuja en
 * tamaño NATURAL y el <group> padre escala a `item.size` (fit-to-box). Por eso
 * el CONTEO de baldas/divisor depende del tamaño REAL (lo que el usuario ve),
 * pero las POSICIONES se devuelven en coordenadas NATURALES (las que dibujamos).
 */
import type { Size } from "../domain/types";

export interface ShelfLayout {
  /** Grosor de cada panel (lateral, techo, base, fondo, balda), en natural. */
  panel: number;
  /** Altura (centro) de cada balda interior, en coords del modelo (base en 0). */
  shelfYs: number[];
  /** Hay un panel divisor vertical en el centro. */
  hasDivider: boolean;
}

export interface ShelfOptions {
  /** Grosor de panel en metros (natural). */
  panel?: number;
  /** Separación deseada entre baldas, en metros reales. */
  shelfGap?: number;
  /** A partir de este ancho real (m) se agrega divisor vertical. */
  dividerMinWidth?: number;
}

/**
 * Nº de baldas interiores según el alto REAL: una cada ~`gap` metros de hueco.
 * Una estantería de 0.9 m → 2 baldas; de 1.8 m → 4. Nunca negativo.
 */
export function shelfCount(realHeight: number, gap: number): number {
  if (gap <= 0) return 0;
  return Math.max(0, Math.round(realHeight / gap) - 1);
}

/**
 * Reparte `count` baldas uniformemente en el hueco interior (entre base y
 * techo, descontando los paneles). `count` baldas crean `count+1` divisiones.
 */
export function shelfPositions(
  count: number,
  naturalHeight: number,
  panel: number,
): number[] {
  const innerBottom = panel;
  const innerTop = naturalHeight - panel;
  const span = innerTop - innerBottom;
  if (count <= 0 || span <= 0) return [];
  return Array.from(
    { length: count },
    (_, i) => innerBottom + (span * (i + 1)) / (count + 1),
  );
}

/** Layout completo de la estantería: baldas + divisor, listo para dibujar. */
export function shelfLayout(
  real: Size,
  natural: Size,
  opts: ShelfOptions = {},
): ShelfLayout {
  const panel = opts.panel ?? 0.02;
  const gap = opts.shelfGap ?? 0.35;
  const dividerMinWidth = opts.dividerMinWidth ?? 0.9;

  const count = shelfCount(real.height, gap);
  return {
    panel,
    shelfYs: shelfPositions(count, natural.height, panel),
    hasDivider: real.width >= dividerMinWidth,
  };
}
