/**
 * Render 3D de los objetos colocados. Lee del store y posiciona cada item.
 * Click en un item -> lo selecciona (estado compartido con la planta).
 */
import type { ThreeEvent } from "@react-three/fiber";
import { useDesignStore } from "../state/designStore";
import { ItemModel } from "../catalog/ItemModel";
import { naturalSize } from "../catalog/catalog";

export function Items() {
  const items = useDesignStore((s) => s.design.items);
  const selectedItemId = useDesignStore((s) => s.selectedItemId);
  const selectItem = useDesignStore((s) => s.selectItem);

  return (
    <>
      {items.map((it) => {
        // Fit-to-box: escala el modelo natural para entrar en su size real.
        const nat = naturalSize(it.modelRef);
        const scale: [number, number, number] = [
          it.size.width / nat.width,
          it.size.height / nat.height,
          it.size.depth / nat.depth,
        ];
        return (
          <group
            key={it.id}
            position={[it.position.x, it.position.y, it.position.z]}
            rotation={[0, it.rotationY, 0]}
            scale={scale}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              selectItem(it.id);
            }}
          >
            <ItemModel item={it} selected={selectedItemId === it.id} />
          </group>
        );
      })}
    </>
  );
}
