/**
 * Editor de planta 2D (top-down) en SVG.
 *
 * Por qué SVG y no WebGL: para una planta 2D (arrastrar esquinas e items,
 * clickear paredes) el DOM nos da hit-testing y eventos de puntero gratis.
 *
 * No tiene estado de negocio propio: lee del store y llama a sus acciones.
 * Responsabilidades repartidas:
 *   - planTransform.ts  -> matemáticas de coordenadas (puro, testeado)
 *   - usePlanDrag       -> mecánica de arrastre
 *   - WallControls      -> panel de la pared seleccionada
 * Este archivo solo dibuja el lienzo.
 */
import { useMemo } from "react";
import { useDesignStore } from "../state/designStore";
import { wallSegments, wallLength } from "../domain/geometry";
import { toPx, PX_W, PX_H } from "./planTransform";
import { usePlanDrag } from "./usePlanDrag";
import { WallControls } from "./WallControls";
import "./PlanEditor.css";

const MURITO_MAX = 2.0; // por debajo de esta altura, una pared es murito

export function PlanEditor() {
  const design = useDesignStore((s) => s.design);
  const points = design.points;
  const movePoint = useDesignStore((s) => s.movePoint);
  const moveItem = useDesignStore((s) => s.moveItem);
  const selectedItemId = useDesignStore((s) => s.selectedItemId);
  const selectItem = useDesignStore((s) => s.selectItem);
  const selectedWall = useDesignStore((s) => s.selectedWall);
  const selectWall = useDesignStore((s) => s.selectWall);

  const segments = useMemo(() => wallSegments(design), [design]);

  const {
    svgRef,
    transform,
    drag,
    startCornerDrag,
    startItemDrag,
    onPointerMove,
    endDrag,
  } = usePlanDrag({
    points,
    items: design.items,
    movePoint,
    moveItem,
    onItemDragStart: selectItem,
  });

  return (
    <div className="plan">
      <div className="plan-title">Planta (top-down)</div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PX_W} ${PX_H}`}
        className="plan-svg"
        onPointerDown={() => selectItem(null)} /* limpia item y pared */
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <polygon
          className="plan-floor"
          points={points
            .map((p) => {
              const q = toPx(transform, p);
              return `${q.x},${q.y}`;
            })
            .join(" ")}
        />

        {segments.map((seg) => {
          const a = toPx(transform, seg.start);
          const b = toPx(transform, seg.end);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const cls = [
            "plan-wall",
            selectedWall === seg.index ? "is-selected" : "",
            seg.height < MURITO_MAX ? "is-murito" : "",
          ].join(" ");
          return (
            <g key={seg.index}>
              {/* Línea gruesa transparente: agranda el área clickeable. */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="plan-wall-hit"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  selectWall(seg.index); // deselecciona item
                }}
              />
              {/* Línea visible (no intercepta clicks; lo hace la de arriba). */}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={cls} />
              <text x={mid.x} y={mid.y - 5} className="plan-label">
                {wallLength(seg).toFixed(2)}m
              </text>
            </g>
          );
        })}

        {/* Huecos (puertas/ventanas): tramo marcado sobre la pared. */}
        {segments.map((seg) => {
          const len = wallLength(seg);
          if (len === 0) return null;
          const ux = (seg.end.x - seg.start.x) / len;
          const uy = (seg.end.y - seg.start.y) / len;
          return seg.openings.map((op, oi) => {
            const a = toPx(transform, {
              x: seg.start.x + ux * op.offset,
              y: seg.start.y + uy * op.offset,
            });
            const b = toPx(transform, {
              x: seg.start.x + ux * (op.offset + op.width),
              y: seg.start.y + uy * (op.offset + op.width),
            });
            return (
              <line
                key={`${seg.index}-${oi}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={op.sill > 0 ? "plan-window" : "plan-door"}
              />
            );
          });
        })}

        {/* Items: rectángulo a escala con el footprint real (ancho × fondo). */}
        {design.items.map((it) => {
          const q = toPx(transform, { x: it.position.x, y: -it.position.z });
          const isSel = selectedItemId === it.id;
          const w = Math.max(8, it.size.width * transform.scale);
          const d = Math.max(8, it.size.depth * transform.scale);
          // rotationY (3D, antihorario desde arriba) -> rotación SVG (horaria).
          const angle = (-it.rotationY * 180) / Math.PI;
          return (
            <rect
              key={it.id}
              x={q.x - w / 2}
              y={q.y - d / 2}
              width={w}
              height={d}
              rx={2}
              transform={`rotate(${angle} ${q.x} ${q.y})`}
              className={`plan-item ${isSel ? "is-selected" : ""}`}
              onPointerDown={startItemDrag(it.id)}
            />
          );
        })}

        {points.map((p, i) => {
          const q = toPx(transform, p);
          const isDragging = drag?.kind === "corner" && drag.index === i;
          return (
            <circle
              key={i}
              cx={q.x}
              cy={q.y}
              r={6}
              className={`plan-corner ${isDragging ? "is-dragging" : ""}`}
              onPointerDown={startCornerDrag(i)}
            />
          );
        })}
      </svg>

      <WallControls />
    </div>
  );
}
