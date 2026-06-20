/**
 * Panel de azulejos. Sube fotos, las registra como Material y las aplica a la
 * superficie seleccionada. El "a qué superficie aplico" vive en useTextureTarget;
 * este componente solo maneja la galería y el tamaño del azulejo.
 *
 * La foto se convierte en un object URL (vive en memoria durante la sesión).
 * El azulejo guarda ese src + su ancho y largo reales (puede ser rectangular).
 */
import { useState } from "react";
import { useDesignStore } from "../state/designStore";
import { useTextureTarget } from "./useTextureTarget";
import { fileToDataURL } from "./image";
import "./TexturePanel.css";

export function TexturePanel() {
  const materials = useDesignStore((s) => s.design.materials);
  const addMaterial = useDesignStore((s) => s.addMaterial);
  const removeMaterial = useDesignStore((s) => s.removeMaterial);
  const target = useTextureTarget();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [tileW, setTileW] = useState(0.3);
  const [tileH, setTileH] = useState(0.3);
  const list = Object.values(materials);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite resubir el mismo archivo
    if (!file) return;
    try {
      // data URL (no object URL): autocontenido y persistible.
      const { src, ratio } = await fileToDataURL(file);
      const id = crypto.randomUUID();
      // Ajustamos el largo del azulejo al aspecto de la foto (no deformar).
      const h = Math.max(0.02, +(tileW * ratio).toFixed(2));
      setTileH(h);
      addMaterial({ id, src, tileWidth: tileW, tileHeight: h });
      setActiveId(id);
    } catch (err) {
      console.warn("No se pudo cargar la imagen", err);
    }
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
    // Ya no hay object URL que revocar: las fotos son data URLs autocontenidos.
    removeMaterial(id);
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="tex">
      <div className="tex-title">Azulejos</div>

      <div className={`tex-target ${target.label ? "" : "is-empty"}`}>
        {target.label ? (
          <>
            Superficie: <b>{target.label}</b>
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
          disabled={!activeId || !target.label}
          onClick={() => activeId && target.apply(activeId)}
        >
          {target.label ? `Aplicar a ${target.label}` : "Elegí una superficie"}
        </button>
        {target.hasTile && (
          <button type="button" className="tex-clear" onClick={target.clear}>
            Quitar de {target.label}
          </button>
        )}
      </div>
    </div>
  );
}
