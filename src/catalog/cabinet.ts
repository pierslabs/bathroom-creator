/**
 * Layout del mueble de lavabo (vanity): patas + cuerpo de cajones + encimera con
 * lavabo integrado. Lógica PURA: entran el alto del cuerpo y las proporciones de
 * los cajones, salen las posiciones de cada cajón. Sin Three ni React — testeable.
 *
 * Convención (igual que el resto del catálogo): la geometría se dibuja en tamaño
 * NATURAL y el <group> padre escala a `item.size` (fit-to-box). Por eso las
 * dimensiones del mueble se modelan en metros REALES y coinciden con el `natural`
 * del catálogo; al cambiar `item.size` todo escala manteniendo proporciones.
 */

/** Dimensiones reales del mueble (en metros). Coinciden con el catálogo. */
export interface VanityDims {
  /** Ancho total. */
  width: number;
  /** Profundidad total. */
  depth: number;
  /** Alto de las patas (del suelo a la base del cuerpo). */
  legHeight: number;
  /** Alto del cuerpo de cajones. */
  bodyHeight: number;
  /** Alto de la encimera + seno del lavabo, encima del cuerpo. */
  topHeight: number;
}

/** El mueble del usuario: 80×46, cuerpo 75, patas 8, encimera/lavabo ~12. */
export const VANITY: VanityDims = {
  width: 0.8,
  depth: 0.46,
  legHeight: 0.08,
  bodyHeight: 0.75,
  topHeight: 0.05, // encimera plana (lavabo "plato", seno hundido)
};

/** Proporciones de los cajones, de ARRIBA hacia abajo (27 / 24 / 24 cm). */
export const DRAWER_RATIOS = [27, 24, 24];

/** Alto natural total del mueble: patas + cuerpo + encimera/lavabo. */
export function vanityHeight(d: VanityDims = VANITY): number {
  return d.legHeight + d.bodyHeight + d.topHeight;
}

export interface Drawer {
  /** Centro Y del cajón, medido desde la BASE DEL CUERPO (no del suelo). */
  y: number;
  /** Alto del cajón. */
  height: number;
}

/**
 * Reparte los cajones dentro del cuerpo según `ratios` (de ARRIBA hacia abajo).
 * Cada cajón sale con su alto (proporcional a su ratio) y su centro Y medido
 * desde la base del cuerpo (y=0). La suma de alturas == `bodyHeight` siempre,
 * aunque los ratios no estén normalizados.
 */
export function drawerLayout(bodyHeight: number, ratios: number[]): Drawer[] {
  const total = ratios.reduce((a, b) => a + b, 0);
  if (total <= 0 || bodyHeight <= 0) return [];
  let top = bodyHeight; // borde superior del cuerpo; apilamos hacia abajo
  return ratios.map((r) => {
    const height = (r / total) * bodyHeight;
    const y = top - height / 2;
    top -= height;
    return { y, height };
  });
}
