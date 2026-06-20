/**
 * Resuelve la SUPERFICIE destino del azulejo a partir de la selección global
 * (piso / pared / murete de mampara) y expone una interfaz uniforme para
 * aplicar y quitar. Antes esta lógica vivía como 4 ternarios triples repetidos
 * dentro de TexturePanel (label, hasTile, apply, clear).
 */
import { useDesignStore } from "../state/designStore";
import { kindOf } from "../catalog/catalog";

export interface TextureTarget {
  /** Etiqueta legible de la superficie, o null si no hay ninguna seleccionada. */
  label: string | null;
  /** ¿La superficie ya tiene un azulejo aplicado? */
  hasTile: boolean;
  apply: (materialId: string) => void;
  clear: () => void;
}

const NONE: TextureTarget = {
  label: null,
  hasTile: false,
  apply: () => {},
  clear: () => {},
};

export function useTextureTarget(): TextureTarget {
  const design = useDesignStore((s) => s.design);
  const selectedWall = useDesignStore((s) => s.selectedWall);
  const floorSelected = useDesignStore((s) => s.floorSelected);
  const selectedItemId = useDesignStore((s) => s.selectedItemId);
  const setFloorMaterial = useDesignStore((s) => s.setFloorMaterial);
  const setWallMaterial = useDesignStore((s) => s.setWallMaterial);
  const setItemBaseMaterial = useDesignStore((s) => s.setItemBaseMaterial);

  if (floorSelected) {
    return {
      label: "piso",
      hasTile: design.floorMaterialId != null,
      apply: (id) => setFloorMaterial(id),
      clear: () => setFloorMaterial(null),
    };
  }

  if (selectedWall !== null) {
    return {
      label: `pared ${selectedWall}`,
      hasTile: design.walls[selectedWall]?.materialId != null,
      apply: (id) => setWallMaterial(selectedWall, id),
      clear: () => setWallMaterial(selectedWall, null),
    };
  }

  const item = design.items.find((i) => i.id === selectedItemId) ?? null;
  if (item && kindOf(item.modelRef) === "shower" && (item.baseHeight ?? 0) > 0) {
    return {
      label: "murete mampara",
      hasTile: item.baseMaterialId != null,
      apply: (id) => setItemBaseMaterial(item.id, id),
      clear: () => setItemBaseMaterial(item.id, null),
    };
  }

  return NONE;
}
