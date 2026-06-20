/**
 * Panel de azulejos. Sube una foto, la registra como Material y la aplica a la
 * SUPERFICIE seleccionada (piso o pared). Sin lógica de negocio: orquesta el
 * store. La superficie se elige clickeando en el 3D (piso o pared).
 *
 * La foto se convierte en un object URL (vive en memoria durante la sesión).
 * El azulejo guarda ese src + su ancho y largo reales (puede ser rectangular).
 */
import { useRef, useState } from "react";
import { useDesignStore } from "../state/designStore";
import { kindOf } from "../catalog/catalog";
import "./TexturePanel.css";

export function TexturePanel() {
  const materials = useDesignStore((s) => s.design.materials);
  const floorMaterialId = useDesignStore((s) => s.design.floorMaterialId);
  const walls = useDesignStore((s) => s.design.walls);
  const addMaterial = useDesignStore((s) => s.addMaterial);
  const setFloorMaterial = useDesignStore((s) => s.setFloorMaterial);
  const setWallMaterial = useDesignStore((s) => s.setWallMaterial);
  const removeMaterial = useDesignStore((s) => s.removeMaterial);
  const setItemBaseMaterial = useDesignStore((s) => s.setItemBaseMaterial);
  const selectedWall = useDesignStore((s) => s.selectedWall);
  const floorSelected = useDesignStore((s) => s.floorSelected);
  const selectedItemId = useDesignStore((s) => s.selectedItemId);
  const items = useDesignStore((s) => s.design.items);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [tileW, setTileW] = useState(0.3);
  const [tileH, setTileH] = useState(0.3);
  const counter = useRef(0);
  const list = Object.values(materials);

  // El murete de una mampara seleccionada también es revestible.
  const selItem = items.find((i) => i.id === selectedItemId) ?? null;
  const showerBase =
    selItem && kindOf(selItem.modelRef) === "shower" && (selItem.baseHeight ?? 0) > 0
      ? selItem
      : null;

  // Superficie destino, derivada de la selección global.
  const surfaceLabel = floorSelected
    ? "piso"
    : selectedWall !== null
      ? `pared ${selectedWall}`
      : showerBase
        ? "murete mampara"
        : null;

  const surfaceHasTile = floorSelected
    ? floorMaterialId != null
    : selectedWall !== null
      ? walls[selectedWall]?.materialId != null
      : showerBase
        ? showerBase.baseMaterialId != null
        : false;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    counter.current += 1;
    const id = `mat-${counter.current}`;
    const src = URL.createObjectURL(file);

    // Leemos la proporción real de la imagen para no deformar el azulejo:
    // ajustamos el largo según el aspecto (alto/ancho) de la foto.
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
      const h = Math.max(0.02, +(tileW * ratio).toFixed(2));
      setTileH(h);
      addMaterial({ id, src, tileWidth: tileW, tileHeight: h });
      setActiveId(id);
    };
    img.src = src;
    e.target.value = ""; // permite resubir el mismo archivo
  };

  const updateTile = (w: number, h: number) => {
    const nw = Math.max(0.02, w || 0.02);
    const nh = Math.max(0.02, h || 0.02);
    setTileW(nw);
    setTileH(nh);
    if (activeId && materials[activeId]) {
      addMaterial({
        id: activeId,
        src: materials[activeId].src,
        tileWidth: nw,
        tileHeight: nh,
      });
    }
  };

  const deleteMaterial = (id: string) => {
    const mat = materials[id];
    if (mat) URL.revokeObjectURL(mat.src); // libera la memoria de la foto
    removeMaterial(id);
    if (activeId === id) setActiveId(null);
  };

  const apply = () => {
    if (!activeId) return;
    if (floorSelected) setFloorMaterial(activeId);
    else if (selectedWall !== null) setWallMaterial(selectedWall, activeId);
    else if (showerBase) setItemBaseMaterial(showerBase.id, activeId);
  };

  const clear = () => {
    if (floorSelected) setFloorMaterial(null);
    else if (selectedWall !== null) setWallMaterial(selectedWall, null);
    else if (showerBase) setItemBaseMaterial(showerBase.id, null);
  };

  return (
    <div className="tex">
      <div className="tex-title">Azulejos</div>

      <div className={`tex-target ${surfaceLabel ? "" : "is-empty"}`}>
        {surfaceLabel ? (
          <>
            Superficie: <b>{surfaceLabel}</b>
          </>
        ) : (
          "Clic en el piso o una pared (en el 3D)"
        )}
      </div>

      <label className="tex-upload">
        + Subir foto
        <input type="file" accept="image/*" onChange={onFile} hidden />
      </label>

      {list.length > 0 && (
        <div className="tex-gallery">
          {list.map((m) => (
            <div key={m.id} className="tex-swatch-wrap">
              <button
                type="button"
                className={`tex-swatch ${activeId === m.id ? "is-active" : ""}`}
                style={{ backgroundImage: `url(${m.src})` }}
                onClick={() => {
                  setActiveId(m.id);
                  setTileW(m.tileWidth);
                  setTileH(m.tileHeight);
                }}
                title={`Azulejo ${m.tileWidth}×${m.tileHeight}m`}
              />
              <button
                type="button"
                className="tex-swatch-del"
                title="Eliminar azulejo"
                onClick={() => deleteMaterial(m.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="tex-size">
        <label className="tex-field">
          <span>Ancho</span>
          <input
            type="number"
            min={0.02}
            step={0.05}
            value={tileW}
            onChange={(e) => updateTile(Number(e.target.value), tileH)}
          />
          <span className="tex-unit">m</span>
        </label>
        <label className="tex-field">
          <span>Largo</span>
          <input
            type="number"
            min={0.02}
            step={0.05}
            value={tileH}
            onChange={(e) => updateTile(tileW, Number(e.target.value))}
          />
          <span className="tex-unit">m</span>
        </label>
      </div>

      <div className="tex-actions">
        <button
          type="button"
          disabled={!activeId || !surfaceLabel}
          onClick={apply}
        >
          {surfaceLabel ? `Aplicar a ${surfaceLabel}` : "Elegí una superficie"}
        </button>
        {surfaceHasTile && (
          <button type="button" className="tex-clear" onClick={clear}>
            Quitar de {surfaceLabel}
          </button>
        )}
      </div>
    </div>
  );
}
