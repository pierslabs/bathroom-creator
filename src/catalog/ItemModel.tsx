/**
 * Geometría de cada objeto. HOY son placeholders (cajas/paneles) para construir
 * el sistema sin assets. Cuando tengas modelos reales, este es el ÚNICO archivo
 * que cambia: reemplazás el switch por algo como:
 *
 *   const { scene } = useGLTF(modelRef);
 *   return <primitive object={scene.clone()} />;
 *
 * El resto de la app (store, selección, planta, mover/rotar) queda intacto.
 *
 * Convención: cada modelo se dibuja con su BASE apoyada en y=0 y centrado en
 * (x=0, z=0). La posición/rotación/escala reales las pone el <group> padre.
 */
import type { Item } from "../domain/types";
import { useDesignStore } from "../state/designStore";
import { TileMaterial } from "../scene/TileMaterial";
import { kindOf, naturalSize } from "./catalog";
import { cabinetLayout } from "./cabinet";
import { ACCENT } from "../scene/theme";

const BASE = "#cdd6df";
const SELECTED = ACCENT;

export function ItemModel({
  item,
  selected,
}: {
  item: Item;
  selected: boolean;
}) {
  const { modelRef } = item;
  const materials = useDesignStore((s) => s.design.materials);
  const color = selected ? SELECTED : BASE;

  switch (kindOf(modelRef)) {
    case "toilet":
      return (
        <group>
          {/* taza */}
          <mesh position={[0, 0.2, 0.05]} castShadow>
            <boxGeometry args={[0.38, 0.4, 0.55]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* mochila */}
          <mesh position={[0, 0.45, -0.22]} castShadow>
            <boxGeometry args={[0.38, 0.5, 0.16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );

    case "sink":
      return (
        <group>
          {/* encimera */}
          <mesh position={[0, 0.82, 0]} castShadow>
            <boxGeometry args={[0.6, 0.12, 0.45]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* pedestal */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.76, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );

    case "shower": {
      // Mampara: murete macizo abajo (opcional) + cristal arriba.
      // baseHeight está en metros reales; lo paso a fracción de la altura para
      // que sobreviva el escalado fit-to-box y quede en los cm pedidos.
      const nat = naturalSize(modelRef);
      const frac =
        item.size.height > 0
          ? Math.min(1, Math.max(0, (item.baseHeight ?? 0) / item.size.height))
          : 0;
      const baseH = frac * nat.height;
      const glassH = nat.height - baseH;
      const baseMat = item.baseMaterialId ? materials[item.baseMaterialId] : null;
      return (
        <group>
          {baseH > 0 && (
            <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[nat.width, baseH, nat.depth]} />
              {baseMat ? (
                // Repeat según las dimensiones REALES de la cara del murete.
                <TileMaterial
                  src={baseMat.src}
                  repeatX={item.size.width / baseMat.tileWidth}
                  repeatY={(item.baseHeight ?? 0) / baseMat.tileHeight}
                  highlight={selected}
                />
              ) : (
                <meshStandardMaterial color={selected ? SELECTED : "#dfe3e8"} />
              )}
            </mesh>
          )}
          {glassH > 0 && (
            <mesh position={[0, baseH + glassH / 2, 0]} castShadow>
              <boxGeometry args={[nat.width, glassH, nat.depth]} />
              <meshStandardMaterial
                color={selected ? SELECTED : "#9fd8ef"}
                transparent
                opacity={0.35}
                roughness={0.05}
                metalness={0.1}
              />
            </mesh>
          )}
        </group>
      );
    }

    case "shower_tray": {
      // Plato de ducha: base baja (8cm) con desagüe posicionable.
      const nat = naturalSize(modelRef);
      const dp = item.drainPosition ?? "center";
      // Offset en coords naturales (fracción del medio-lado); escala con el plato.
      const dx = dp === "corner" ? nat.width * 0.33 : 0;
      const dz = dp === "center" ? 0 : -nat.depth * 0.33;
      return (
        <group>
          <mesh position={[0, nat.height / 2, 0]} receiveShadow castShadow>
            <boxGeometry args={[nat.width, nat.height, nat.depth]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* desagüe */}
          <mesh position={[dx, nat.height + 0.001, dz]}>
            <cylinderGeometry args={[0.05, 0.05, 0.005, 16]} />
            <meshStandardMaterial color="#8a8f96" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      );
    }

    case "mirror": {
      // Espejo plano colgable (subir "Altura suelo" en el panel). Cuadrado =
      // panel fino; redondo = disco (cilindro corto girado para mirar al frente).
      // Look reflectante simple: metálico claro (sin reflexión real, es caro).
      const nat = naturalSize(modelRef);
      const { width: W, height: H, depth: D } = nat;
      const round = item.mirrorShape === "round";
      const r = Math.min(W, H) / 2;
      return (
        <group>
          <mesh
            position={[0, H / 2, 0]}
            rotation={round ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
            castShadow
          >
            {round ? (
              <cylinderGeometry args={[r, r, D, 32]} />
            ) : (
              <boxGeometry args={[W, H, D]} />
            )}
            <meshStandardMaterial
              color={selected ? SELECTED : "#aebfc9"}
              metalness={0.9}
              roughness={0.08}
            />
          </mesh>
        </group>
      );
    }

    case "cabinet":
    default: {
      // Mueble como CARCASA hueca, no como bloque macizo: laterales + techo +
      // base + fondo, y el interior con baldas. Frente abierto para ver el hueco.
      // Se dibuja en tamaño natural; el <group> padre escala a item.size.
      const nat = naturalSize(modelRef);
      const { width: W, height: H, depth: D } = nat;
      const layout = cabinetLayout(item.size, nat);
      const p = layout.panel;
      // Panel = caja con posición + tamaño; se mapean todas con el mismo material.
      const panels: { pos: [number, number, number]; size: [number, number, number] }[] = [
        { pos: [-(W - p) / 2, H / 2, 0], size: [p, H, D] }, // lateral izq
        { pos: [(W - p) / 2, H / 2, 0], size: [p, H, D] }, // lateral der
        { pos: [0, p / 2, 0], size: [W, p, D] }, // base
        { pos: [0, H - p / 2, 0], size: [W, p, D] }, // techo
        { pos: [0, H / 2, -(D - p) / 2], size: [W, H, p] }, // fondo
      ];
      if (layout.hasDivider) {
        panels.push({ pos: [0, H / 2, p / 2], size: [p, H - 2 * p, D - p] });
      }
      // Baldas interiores: ancho/fondo útiles (descontando laterales y fondo).
      for (const y of layout.shelfYs) {
        panels.push({ pos: [0, y, p / 2], size: [W - 2 * p, p, D - p] });
      }
      return (
        <group>
          {panels.map((b, i) => (
            <mesh key={i} position={b.pos} castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    }
  }
}
