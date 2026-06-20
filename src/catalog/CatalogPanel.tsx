/**
 * Panel de catálogo y controles del item seleccionado.
 * Solo orquesta acciones del store; sin lógica de negocio propia.
 */
import { useDesignStore } from "../state/designStore";
import { toWorldXZ } from "../scene/coords";
import type { Point2 } from "../domain/types";
import { CATALOG, kindOf } from "./catalog";
import "./CatalogPanel.css";

const HALF_PI = Math.PI / 2;

/** Centro (bounding box) del baño, en coordenadas de MUNDO. */
function roomCenterWorld(points: Point2[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const [x, z] = toWorldXZ({ x: cx, y: cy });
  return { x, y: 0, z };
}

export function CatalogPanel() {
  const design = useDesignStore((s) => s.design);
  const addItem = useDesignStore((s) => s.addItem);
  const removeItem = useDesignStore((s) => s.removeItem);
  const rotateItem = useDesignStore((s) => s.rotateItem);
  const resizeItem = useDesignStore((s) => s.resizeItem);
  const setItemBaseHeight = useDesignStore((s) => s.setItemBaseHeight);
  const setItemDrain = useDesignStore((s) => s.setItemDrain);
  const selectedItemId = useDesignStore((s) => s.selectedItemId);
  const selectItem = useDesignStore((s) => s.selectItem);

  const selected = design.items.find((it) => it.id === selectedItemId) ?? null;
  const isShower = selected ? kindOf(selected.modelRef) === "shower" : false;
  const isTray = selected ? kindOf(selected.modelRef) === "shower_tray" : false;
  const DRAINS = [
    { value: "center", label: "Centro" },
    { value: "back", label: "Borde" },
    { value: "corner", label: "Esquina" },
  ] as const;

  const add = (modelRef: string) => {
    const id = addItem(modelRef, roomCenterWorld(design.points));
    selectItem(id);
  };

  return (
    <div className="catalog">
      <div className="catalog-title">Catálogo</div>
      <div className="catalog-grid">
        {CATALOG.map((entry) => (
          <button
            key={entry.modelRef}
            type="button"
            className="catalog-btn"
            onClick={() => add(entry.modelRef)}
          >
            + {entry.label}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="catalog-controls">
          <div className="catalog-subtitle">Item seleccionado</div>

          <div className="catalog-size">
            {(["width", "depth", "height"] as const).map((dim) => (
              <label key={dim} className="catalog-size-field">
                <span>{dim === "width" ? "Ancho" : dim === "depth" ? "Fondo" : "Alto"}</span>
                <input
                  type="number"
                  min={0.05}
                  step={0.05}
                  value={selected.size[dim]}
                  onChange={(e) =>
                    resizeItem(selected.id, {
                      ...selected.size,
                      [dim]: Math.max(0.05, Number(e.target.value) || 0.05),
                    })
                  }
                />
                <span className="catalog-unit">m</span>
              </label>
            ))}
          </div>

          {isShower && (
            <label className="catalog-size-field catalog-base">
              <span>Muro bajo</span>
              <input
                type="number"
                min={0}
                max={selected.size.height}
                step={0.05}
                value={selected.baseHeight ?? 0}
                onChange={(e) =>
                  setItemBaseHeight(
                    selected.id,
                    Math.min(
                      selected.size.height,
                      Math.max(0, Number(e.target.value) || 0),
                    ),
                  )
                }
              />
              <span className="catalog-unit">m</span>
            </label>
          )}

          {isTray && (
            <div className="catalog-drain">
              <span className="catalog-drain-label">Desagüe</span>
              <div className="catalog-drain-opts">
                {DRAINS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={
                      (selected.drainPosition ?? "center") === d.value
                        ? "is-on"
                        : ""
                    }
                    onClick={() => setItemDrain(selected.id, d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="catalog-row">
            <button
              type="button"
              onClick={() => rotateItem(selected.id, selected.rotationY - HALF_PI)}
            >
              ⟲ 90°
            </button>
            <button
              type="button"
              onClick={() => rotateItem(selected.id, selected.rotationY + HALF_PI)}
            >
              ⟳ 90°
            </button>
            <button
              type="button"
              className="catalog-danger"
              onClick={() => removeItem(selected.id)}
            >
              Borrar
            </button>
          </div>
          <small>Arrastralo desde la planta (abajo) para ubicarlo.</small>
        </div>
      ) : (
        <div className="catalog-hint">
          Agregá objetos y clickealos para seleccionarlos.
        </div>
      )}
    </div>
  );
}
