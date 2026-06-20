/**
 * Controles de la pared seleccionada (altura, transparencia, puerta).
 * Se vale solo: lee la selección y las acciones del store. Si no hay pared
 * seleccionada, muestra la ayuda de la planta.
 */
import { useMemo } from "react";
import { useDesignStore } from "../state/designStore";
import { wallSegments, wallLength } from "../domain/geometry";

export function WallControls() {
  const design = useDesignStore((s) => s.design);
  const selectedWall = useDesignStore((s) => s.selectedWall);
  const setWallHeight = useDesignStore((s) => s.setWallHeight);
  const setWallTransparent = useDesignStore((s) => s.setWallTransparent);
  const addOpening = useDesignStore((s) => s.addOpening);
  const updateOpening = useDesignStore((s) => s.updateOpening);
  const removeOpening = useDesignStore((s) => s.removeOpening);

  const segments = useMemo(() => wallSegments(design), [design]);

  if (selectedWall === null) {
    return (
      <div className="plan-hint">
        Arrastrá esquinas e items · clic en una pared para su altura
      </div>
    );
  }

  const wall = design.walls[selectedWall];
  const selLen = wallLength(segments[selectedWall]);

  return (
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
          onChange={(e) => setWallHeight(selectedWall, Number(e.target.value))}
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
  );
}
