/**
 * Store del diseño (Zustand). Es la FUENTE DE VERDAD viva de la app.
 *
 * Regla de oro: aquí vive el `Design` serializable y las acciones que lo mutan.
 * Los componentes 3D LEEN de aquí y se redibujan; nunca al revés. El render es
 * una proyección de este estado, no su dueño.
 */
import { create } from "zustand";
import type {
  Design,
  DrainPosition,
  Item,
  Material,
  Opening,
  Point2,
  Size,
} from "../domain/types";
import { naturalSize } from "../catalog/catalog";

/** Baño en L por defecto (basado en el croquis), para tener algo que mostrar. */
function defaultDesign(): Design {
  const points: Point2[] = [
    { x: 0, y: 0 },
    { x: 3.6, y: 0 },
    { x: 3.6, y: 3 },
    { x: 1, y: 3 },
    { x: 1, y: 2.2 },
    { x: 0, y: 2.2 },
  ];
  return {
    points,
    walls: points.map(() => ({
      height: 2.4,
      thickness: 0.1,
      materialId: null,
      openings: [],
    })),
    items: [],
    materials: {},
    floorMaterialId: null,
  };
}

let itemCounter = 0;
function nextItemId(): string {
  itemCounter += 1;
  return `item-${itemCounter}`;
}

interface DesignState {
  design: Design;
  /** Item seleccionado. Estado de UI compartido: 3D y planta lo resaltan. */
  selectedItemId: string | null;
  selectItem: (id: string | null) => void;
  /** Pared seleccionada (índice). Mutuamente excluyente con el item. */
  selectedWall: number | null;
  selectWall: (index: number | null) => void;
  /** ¿Está el piso seleccionado? Mutuamente excluyente con pared e item. */
  floorSelected: boolean;
  selectFloor: () => void;

  // --- Contorno / paredes ---
  /** Mueve una esquina del polígono (la geometría de paredes y piso se deriva sola). */
  movePoint: (index: number, p: Point2) => void;
  /** Cambia la altura de una pared. Bajála para crear un murito. */
  setWallHeight: (index: number, height: number) => void;
  setWallMaterial: (index: number, materialId: string | null) => void;
  /** Fuerza/quita la transparencia manual de una pared. */
  setWallTransparent: (index: number, value: boolean) => void;
  /** Agrega un hueco (puerta/ventana) a una pared. */
  addOpening: (wallIndex: number, opening: Opening) => void;
  updateOpening: (
    wallIndex: number,
    openingIndex: number,
    patch: Partial<Opening>,
  ) => void;
  removeOpening: (wallIndex: number, openingIndex: number) => void;

  // --- Items (catálogo glTF) ---
  addItem: (modelRef: string, position?: Item["position"]) => string;
  moveItem: (id: string, position: Item["position"]) => void;
  rotateItem: (id: string, rotationY: number) => void;
  resizeItem: (id: string, size: Size) => void;
  /** Solo mampara: altura del murete macizo inferior, en metros. */
  setItemBaseHeight: (id: string, baseHeight: number) => void;
  /** Solo mampara: azulejo que reviste el murete. */
  setItemBaseMaterial: (id: string, materialId: string | null) => void;
  /** Solo plato de ducha: posición del desagüe. */
  setItemDrain: (id: string, position: DrainPosition) => void;
  removeItem: (id: string) => void;

  // --- Materiales (fotos de azulejos) ---
  addMaterial: (material: Material) => void;
  setFloorMaterial: (materialId: string | null) => void;
  /** Elimina un azulejo y limpia toda referencia a él (piso y paredes). */
  removeMaterial: (id: string) => void;

  // --- Persistencia ---
  exportDesign: () => string;
  loadDesign: (design: Design) => void;
  reset: () => void;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  design: defaultDesign(),
  selectedItemId: null,
  selectedWall: null,
  floorSelected: false,

  // Selección mutuamente excluyente: elegir una superficie/objeto limpia el resto.
  selectItem: (id) =>
    set({ selectedItemId: id, selectedWall: null, floorSelected: false }),
  selectWall: (index) =>
    set({ selectedWall: index, selectedItemId: null, floorSelected: false }),
  selectFloor: () =>
    set({ floorSelected: true, selectedItemId: null, selectedWall: null }),

  movePoint: (index, p) =>
    set((s) => {
      const points = s.design.points.map((pt, i) => (i === index ? p : pt));
      return { design: { ...s.design, points } };
    }),

  setWallHeight: (index, height) =>
    set((s) => {
      const walls = s.design.walls.map((w, i) =>
        i === index ? { ...w, height } : w,
      );
      return { design: { ...s.design, walls } };
    }),

  setWallMaterial: (index, materialId) =>
    set((s) => {
      const walls = s.design.walls.map((w, i) =>
        i === index ? { ...w, materialId } : w,
      );
      return { design: { ...s.design, walls } };
    }),

  setWallTransparent: (index, value) =>
    set((s) => ({
      design: {
        ...s.design,
        walls: s.design.walls.map((w, i) =>
          i === index ? { ...w, transparent: value } : w,
        ),
      },
    })),

  addOpening: (wallIndex, opening) =>
    set((s) => ({
      design: {
        ...s.design,
        walls: s.design.walls.map((w, i) =>
          i === wallIndex ? { ...w, openings: [...w.openings, opening] } : w,
        ),
      },
    })),

  updateOpening: (wallIndex, openingIndex, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        walls: s.design.walls.map((w, i) =>
          i === wallIndex
            ? {
                ...w,
                openings: w.openings.map((o, oi) =>
                  oi === openingIndex ? { ...o, ...patch } : o,
                ),
              }
            : w,
        ),
      },
    })),

  removeOpening: (wallIndex, openingIndex) =>
    set((s) => ({
      design: {
        ...s.design,
        walls: s.design.walls.map((w, i) =>
          i === wallIndex
            ? {
                ...w,
                openings: w.openings.filter((_, oi) => oi !== openingIndex),
              }
            : w,
        ),
      },
    })),

  addItem: (modelRef, position = { x: 0, y: 0, z: 0 }) => {
    const id = nextItemId();
    const item: Item = {
      id,
      modelRef,
      position,
      rotationY: 0,
      size: { ...naturalSize(modelRef) }, // arranca en su tamaño real
    };
    set((s) => ({ design: { ...s.design, items: [...s.design.items, item] } }));
    return id;
  },

  moveItem: (id, position) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) =>
          it.id === id ? { ...it, position } : it,
        ),
      },
    })),

  rotateItem: (id, rotationY) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) =>
          it.id === id ? { ...it, rotationY } : it,
        ),
      },
    })),

  resizeItem: (id, size) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) =>
          it.id === id ? { ...it, size } : it,
        ),
      },
    })),

  setItemBaseHeight: (id, baseHeight) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) =>
          it.id === id ? { ...it, baseHeight } : it,
        ),
      },
    })),

  setItemBaseMaterial: (id, materialId) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) =>
          it.id === id ? { ...it, baseMaterialId: materialId ?? undefined } : it,
        ),
      },
    })),

  setItemDrain: (id, position) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.map((it) =>
          it.id === id ? { ...it, drainPosition: position } : it,
        ),
      },
    })),

  removeItem: (id) =>
    set((s) => ({
      design: {
        ...s.design,
        items: s.design.items.filter((it) => it.id !== id),
      },
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
    })),

  addMaterial: (material) =>
    set((s) => ({
      design: {
        ...s.design,
        materials: { ...s.design.materials, [material.id]: material },
      },
    })),

  setFloorMaterial: (materialId) =>
    set((s) => ({ design: { ...s.design, floorMaterialId: materialId } })),

  removeMaterial: (id) =>
    set((s) => {
      const materials = { ...s.design.materials };
      delete materials[id];
      return {
        design: {
          ...s.design,
          materials,
          // Limpia las referencias huérfanas.
          floorMaterialId:
            s.design.floorMaterialId === id ? null : s.design.floorMaterialId,
          walls: s.design.walls.map((w) =>
            w.materialId === id ? { ...w, materialId: null } : w,
          ),
          items: s.design.items.map((it) =>
            it.baseMaterialId === id ? { ...it, baseMaterialId: undefined } : it,
          ),
        },
      };
    }),

  exportDesign: () => JSON.stringify(get().design, null, 2),

  loadDesign: (design) => set({ design }),

  reset: () =>
    set({
      design: defaultDesign(),
      selectedItemId: null,
      selectedWall: null,
      floorSelected: false,
    }),
}));
