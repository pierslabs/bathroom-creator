/**
 * Editor de planta 2D (top-down) en SVG.
 *
 * Por qué SVG y no WebGL: para una planta 2D (arrastrar esquinas e items,
 * clickear paredes) el DOM nos da hit-testing y eventos de puntero gratis.
 *
 * Este editor NO tiene estado de negocio propio: lee del store y llama a sus
 * acciones. El 3D, que lee el mismo store, se actualiza solo. Una sola fuente
 * de verdad, dos vistas. Mover items también ocurre acá (top-down), NO en 3D:
 * el drag en 3 ejes es un infierno de UX que no necesitamos.
 */
import { useMemo, useRef, useState, type PointerEvent } from "react";
import { useDesignStore } from "../state/designStore";
import { wallSegments, wallLength } from "../domain/geometry";
import type { Point2 } from "../domain/types";
import "./PlanEditor.css";

const PX_W = 300;
const PX_H = 260;
const PAD = 28;
const SNAP = 0.05; // metros: grilla a la que se ajustan las esquinas
const MURITO_MAX = 2.0; // por debajo de esto, una pared es murito

interface Transform {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scale: number;
}

type Drag = { kind: "corner"; index: number } | { kind: "item"; id: string };

function computeTransform(points: Point2[]): Transform {
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
function toPx(t: Transform, p: Point2) {
  return {
    x: PAD + (p.x - t.minX) * t.scale,
    y: PAD + (t.maxY - p.y) * t.scale,
  };
}

/** Píxeles SVG -> dominio (metros). */
function toDomain(t: Transform, px: number, py: number): Point2 {
  return {
    x: t.minX + (px - PAD) / t.scale,
    y: t.maxY - (py - PAD) / t.scale,
  };
}

const snap = (v: number) => Math.round(v / SNAP) * SNAP;

export function PlanEditor() {
  const design = useDesignStore((s) => s.design);
  const points = design.points;
  const movePoint = useDesignStore((s) => s.movePoint);
  const moveItem = useDesignStore((s) => s.moveItem);
  const setWallHeight = useDesignStore((s) => s.setWallHeight);
  const setWallTransparent = useDesignStore((s) => s.setWallTransparent);
  const addOpening = useDesignStore((s) => s.addOpening);
  const updateOpening = useDesignStore((s) => s.updateOpening);
  const removeOpening = useDesignStore((s) => s.removeOpening);
  const selectedItemId = useDesignStore((s) => s.selectedItemId);
  const selectItem = useDesignStore((s) => s.selectItem);
  const selectedWall = useDesignStore((s) => s.selectedWall);
  const selectWall = useDesignStore((s) => s.selectWall);

  const segments = useMemo(() => wallSegments(design), [design]);
  const svgRef = useRef<SVGSVGElement>(null);
  // Congelamos el encuadre durante un drag de esquina para que la planta no
  // "respire" mientras movés un punto hacia afuera.
  const frozen = useRef<Transform | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const transform = frozen.current ?? computeTransform(points);

  const startCornerDrag =
    (i: number) => (e: PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      frozen.current = computeTransform(points);
      setDrag({ kind: "corner", index: i });
      (e.target as Element).setPointerCapture(e.pointerId);
    };

  const startItemDrag = (id: string) => (e: PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    selectItem(id); // selectItem ya deselecciona la pared
    setDrag({ kind: "item", id });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * PX_W;
    const py = ((e.clientY - rect.top) / rect.height) * PX_H;
    const d = toDomain(transform, px, py);

    if (drag.kind === "corner") {
      movePoint(drag.index, { x: snap(d.x), y: snap(d.y) });
    } else {
      const it = design.items.find((i) => i.id === drag.id);
      if (it) {
        // Dominio (x,y) -> mundo (x, z = -y). La altura (y) se conserva.
        moveItem(drag.id, { x: snap(d.x), y: it.position.y, z: -snap(d.y) });
      }
    }
  };

  const endDrag = () => {
    setDrag(null);
    frozen.current = null;
  };

  const wall = selectedWall !== null ? design.walls[selectedWall] : null;
  const selSeg = selectedWall !== null ? segments[selectedWall] : null;
  const selLen = selSeg ? wallLength(selSeg) : 0;

  return (
    <div className="plan">
      <div className="plan-title">Planta (top-down)</div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PX_W} ${PX_H}`}
        className="plan-svg"
        onPointerDown={() => selectItem(null)} /* limpia item y pared */
        onPointerMove={onMove}
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
          const isMurito = seg.height < MURITO_MAX;
          const cls = [
            "plan-wall",
            selectedWall === seg.index ? "is-selected" : "",
            isMurito ? "is-murito" : "",
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
          // Footprint en píxeles; mínimo clickeable de 8px.
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

      {selectedWall !== null && wall ? (
        <div className="plan-controls">
          <label>
            Pared {selectedWall} ({selLen.toFixed(2)}m) · altura{" "}
            {wall.height.toFixed(2)}m
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.05}
              value={wall.height}
              onChange={(e) =>
                setWallHeight(selectedWall, Number(e.target.value))
              }
            />
          </label>

          <button
            type="button"
            className={`plan-transparent ${wall.transparent ? "is-on" : ""}`}
            onClick={() => setWallTransparent(selectedWall, !wall.transparent)}
          >
            {wall.transparent ? "✓ Transparente" : "Hacer transparente"}
          </button>

          {wall.openings.length === 0 ? (
            <button
              type="button"
              className="plan-add-door"
              onClick={() =>
                addOpening(selectedWall, {
                  offset: Math.max(0, selLen / 2 - 0.4),
                  width: 0.8,
                  height: 2.0,
                  sill: 0,
                })
              }
            >
              + Puerta
            </button>
          ) : (
            wall.openings.map((op, oi) => (
              <div key={oi} className="plan-door-ctrl">
                <label>
                  Posición {op.offset.toFixed(2)}m
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, selLen - op.width)}
                    step={0.05}
                    value={op.offset}
                    onChange={(e) =>
                      updateOpening(selectedWall, oi, {
                        offset: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="plan-door-width">
                  Ancho
                  <input
                    type="number"
                    min={0.4}
                    step={0.05}
                    value={op.width}
                    onChange={(e) =>
                      updateOpening(selectedWall, oi, {
                        width: Math.max(0.2, Number(e.target.value) || 0.2),
                      })
                    }
                  />
                  m
                </label>
                <button
                  type="button"
                  className="plan-remove-door"
                  onClick={() => removeOpening(selectedWall, oi)}
                >
                  Quitar puerta
                </button>
              </div>
            ))
          )}

          <small>Bajá la altura a ~1.10m para un murito.</small>
        </div>
      ) : (
        <div className="plan-hint">
          Arrastrá esquinas e items · clic en una pared para su altura
        </div>
      )}
    </div>
  );
}
