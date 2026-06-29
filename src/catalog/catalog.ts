/**
 * Catálogo de objetos colocables. Es solo DATA.
 *
 * Hoy `modelRef` coincide con el `kind` y se dibuja con geometría placeholder
 * (ver ItemModel.tsx). El día de mañana, `modelRef` pasa a ser la URL de un
 * archivo .glb y solo cambia ItemModel: el resto de la app (store, planta,
 * selección) no se entera. Ese es el punto de tener un `modelRef` indirecto.
 */
import type { Size } from "../domain/types";

export type ItemKind =
  | "toilet"
  | "sink"
  | "shower"
  | "shower_tray"
  | "cabinet"
  | "shelf"
  | "mirror";

export interface CatalogEntry {
  /** Identificador del modelo. Hoy = kind; mañana = ruta del .glb. */
  modelRef: string;
  label: string;
  kind: ItemKind;
  /**
   * Tamaño NATURAL del modelo en metros: la caja de la geometría tal cual está
   * authorizada en ItemModel.tsx. Es el divisor del fit-to-box y, además, el
   * tamaño por defecto al colocar el item. DEBE coincidir con ItemModel.
   */
  natural: Size;
}

export const CATALOG: CatalogEntry[] = [
  {
    modelRef: "toilet",
    label: "Inodoro",
    kind: "toilet",
    natural: { width: 0.38, height: 0.7, depth: 0.63 },
  },
  {
    modelRef: "sink",
    label: "Lavabo",
    kind: "sink",
    natural: { width: 0.6, height: 0.88, depth: 0.45 },
  },
  {
    modelRef: "shower",
    label: "Mampara",
    kind: "shower",
    natural: { width: 0.9, height: 2.0, depth: 0.04 },
  },
  {
    modelRef: "shower_tray",
    label: "Plato ducha",
    kind: "shower_tray",
    natural: { width: 0.9, height: 0.08, depth: 0.9 },
  },
  {
    // Mueble de lavabo: patas + 3 cajones + encimera/lavabo integrado.
    // Alto = legHeight 0.08 + bodyHeight 0.75 + topHeight 0.05 (ver cabinet.ts).
    modelRef: "cabinet",
    label: "Mueble",
    kind: "cabinet",
    natural: { width: 0.8, height: 0.88, depth: 0.46 },
  },
  {
    // Estantería / mueble auxiliar: carcasa hueca con baldas (ver shelf.ts).
    modelRef: "shelf",
    label: "Estantería",
    kind: "shelf",
    natural: { width: 0.8, height: 0.9, depth: 0.4 },
  },
  {
    modelRef: "mirror",
    label: "Espejo",
    kind: "mirror",
    natural: { width: 0.6, height: 0.8, depth: 0.03 },
  },
];

const BY_REF: Record<string, CatalogEntry> = Object.fromEntries(
  CATALOG.map((e) => [e.modelRef, e]),
);

/** Resuelve el kind a partir del modelRef guardado en un Item. */
export function kindOf(modelRef: string): ItemKind {
  return BY_REF[modelRef]?.kind ?? "cabinet";
}

/** Tamaño natural (caja de la geometría) de un modelRef. */
export function naturalSize(modelRef: string): Size {
  return BY_REF[modelRef]?.natural ?? { width: 0.5, height: 0.5, depth: 0.5 };
}
