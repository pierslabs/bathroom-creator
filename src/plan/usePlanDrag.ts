/**
 * Mecánica de arrastre de la planta: estado del drag (esquina o item), captura
 * de puntero, y el "congelado" del encuadre mientras se arrastra una esquina
 * (para que la planta no respire al mover un punto hacia afuera).
 *
 * Devuelve el svgRef a montar, el transform efectivo y los handlers del SVG.
 */
import { useRef, useState, type PointerEvent } from "react";
import type { Item, Point2 } from "../domain/types";
import {
  computeTransform,
  toDomain,
  snap,
  PX_W,
  PX_H,
  type Transform,
} from "./planTransform";

export type Drag =
  | { kind: "corner"; index: number }
  | { kind: "item"; id: string };

interface Deps {
  points: Point2[];
  items: Item[];
  movePoint: (index: number, p: Point2) => void;
  moveItem: (id: string, position: Item["position"]) => void;
  /** Se llama al empezar a arrastrar un item (para seleccionarlo). */
  onItemDragStart: (id: string) => void;
}

export function usePlanDrag({
  points,
  items,
  movePoint,
  moveItem,
  onItemDragStart,
}: Deps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // El encuadre congelado afecta lo que se dibuja, así que es estado (no ref):
  // leer un ref en render viola las reglas de React.
  const [frozen, setFrozen] = useState<Transform | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const transform = frozen ?? computeTransform(points);

  const startCornerDrag =
    (index: number) => (e: PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      setFrozen(computeTransform(points)); // congela el encuadre durante el drag
      setDrag({ kind: "corner", index });
      (e.target as Element).setPointerCapture(e.pointerId);
    };

  const startItemDrag = (id: string) => (e: PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    onItemDragStart(id);
    setDrag({ kind: "item", id });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * PX_W;
    const py = ((e.clientY - rect.top) / rect.height) * PX_H;
    const d = toDomain(transform, px, py);

    if (drag.kind === "corner") {
      movePoint(drag.index, { x: snap(d.x), y: snap(d.y) });
    } else {
      const it = items.find((i) => i.id === drag.id);
      if (it) {
        // Dominio (x,y) -> mundo (x, z = -y). La altura (y) se conserva.
        moveItem(drag.id, { x: snap(d.x), y: it.position.y, z: -snap(d.y) });
      }
    }
  };

  const endDrag = () => {
    setDrag(null);
    setFrozen(null);
  };

  return {
    svgRef,
    transform,
    drag,
    startCornerDrag,
    startItemDrag,
    onPointerMove,
    endDrag,
  };
}
