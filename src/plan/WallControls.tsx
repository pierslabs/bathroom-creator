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
  const addTileRegion = useDesignStore((s) => s.addTileRegion);
  const updateTileRegion = useDesignStore((s) => s.updateTileRegion);
  const removeTileRegion = useDesignStore((s) => s.removeTileRegion);
  const selectRegion = useDesignStore((s) => s.selectRegion);
  const selectedRegion = useDesignStore((s) => s.selectedRegion);

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
  const matIds = Object.keys(design.materials);
  const regions = wall.tileRegions ?? [];

  const clampN = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(lo, v), Math.max(lo, hi));

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

      <div className="plan-regions">
        {matIds.length === 0 ? (
          <small>Subí un azulejo para revestir zonas.</small>
        ) : (
          <>
            <button
              type="button"
              className="plan-add-door"
              onClick={() => {
                addTileRegion(selectedWall, {
                  offset: Math.max(0, selLen / 2 - 0.5),
                  width: Math.min(1, selLen),
                  bottom: 0,
                  height: Math.min(2, wall.height),
                  materialId: wall.materialId ?? matIds[0],
                });
                selectRegion({ wall: selectedWall, index: regions.length });
              }}
            >
              + Zona de revestimiento
            </button>
            {regions.map((r, ri) => {
              const isSel =
                selectedRegion?.wall === selectedWall &&
                selectedRegion.index === ri;
              // Saneo: la zona SIEMPRE queda dentro de la pared y visible
              // (ancho/alto mínimos), pase lo que pase en los inputs.
              const setField = (
                key: "offset" | "width" | "bottom" | "height",
                value: number,
              ) => {
                const next = { ...r, [key]: value };
                const offset = clampN(next.offset, 0, selLen - 0.1);
                const bottom = clampN(next.bottom, 0, wall.height - 0.1);
                updateTileRegion(selectedWall, ri, {
                  offset,
                  bottom,
                  width: clampN(next.width, 0.1, selLen - offset),
                  height: clampN(next.height, 0.1, wall.height - bottom),
                });
              };
              return (
                <div
                  key={ri}
                  className={`plan-door-ctrl ${isSel ? "is-on" : ""}`}
                >
                  <div className="plan-region-grid">
                    {(
                      [
                        ["offset", "Desde"],
                        ["width", "Ancho"],
                        ["bottom", "Base"],
                        ["height", "Alto"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="plan-door-width">
                        {label}
                        <input
                          type="number"
                          min={0}
                          step={0.05}
                          value={Number(r[key].toFixed(2))}
                          onChange={(e) =>
                            setField(key, Number(e.target.value) || 0)
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="plan-row">
                    <button
                      type="button"
                      onClick={() =>
                        selectRegion({ wall: selectedWall, index: ri })
                      }
                    >
                      {isSel ? "✓ Texturizando" : "Texturizar"}
                    </button>
                    <button
                      type="button"
                      className="plan-remove-door"
                      onClick={() => removeTileRegion(selectedWall, ri)}
                    >
                      Quitar zona
                    </button>
                  </div>
                  {isSel && (
                    <small>
                      Elegí un azulejo en <b>Azulejos</b> y tocá «Aplicar a zona».
                    </small>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <small>Bajá la altura a ~1.10m para un murito.</small>
    </div>
  );
}
