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
import * as THREE from "three";
import type { Item } from "../domain/types";
import { useDesignStore } from "../state/designStore";
import { TileMaterial } from "../scene/TileMaterial";
import { kindOf, naturalSize } from "./catalog";
import { VANITY, DRAWER_RATIOS, drawerLayout } from "./cabinet";
import { shelfLayout } from "./shelf";
import { ACCENT } from "../scene/theme";

const BASE = "#cdd6df";
const SELECTED = ACCENT;

/**
 * Perfil de revolución del cuenco del inodoro: pares (radio, altura) de abajo
 * hacia arriba. LatheGeometry lo gira 360° para un sólido cerámico SUAVE (sin
 * la cintura/pico que dejaban los conos apilados). El <mesh> lo escala en z
 * para darle el óvalo (más profundo que ancho). Definido a nivel módulo: es
 * constante y así no viola las reglas de hooks dentro del switch.
 */
const TOILET_PROFILE = [
  [0.15, 0.0],
  [0.178, 0.03],
  [0.178, 0.13],
  [0.17, 0.24],
  [0.167, 0.32],
  [0.176, 0.4],
  [0.186, 0.45],
  [0.18, 0.47],
].map(([r, y]) => new THREE.Vector2(r, y));

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

  // Madera del mueble/estantería: textura (vetas) si el item tiene material
  // asignado; si no, color liso de roble. El repeat usa el tamaño de la cara
  // (en natural) sobre el tamaño de veta del material, igual que las paredes.
  const itemMat = item.materialId ? materials[item.materialId] : null;
  const woodMat = (faceW: number, faceH: number, fallback = "#d3ba8e") =>
    itemMat ? (
      <TileMaterial
        src={itemMat.src}
        repeatX={faceW / itemMat.tileWidth}
        repeatY={faceH / itemMat.tileHeight}
        highlight={selected}
      />
    ) : (
      <meshStandardMaterial color={selected ? SELECTED : fallback} />
    );

  switch (kindOf(modelRef)) {
    case "toilet": {
      // Inodoro cerámico: cuenco como sólido de revolución (LatheGeometry, perfil
      // suave) + asiento ovalado fino + cisterna apoyada contra la parte trasera.
      const ceramic = () => (
        <meshStandardMaterial
          color={selected ? SELECTED : "#f3f4f6"}
          roughness={0.18}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      );
      return (
        <group>
          {/* Cuenco: revolución suave, ovalado (escala z), centrado adelante.
              scale-y < 1 lo baja un poco sin despegarlo del piso. */}
          <mesh position={[0, 0, 0.05]} scale={[1, 0.9, 1.32]} castShadow receiveShadow>
            <latheGeometry args={[TOILET_PROFILE, 48]} />
            {ceramic()}
          </mesh>
          {/* Asiento / tapa ovalada (fina, sobresale un poco al frente) */}
          <mesh position={[0, 0.435, 0.06]} scale={[1, 1, 1.28]} castShadow>
            <cylinderGeometry args={[0.182, 0.182, 0.035, 48]} />
            {ceramic()}
          </mesh>
          {/* Cisterna, apoyada contra la parte trasera del cuenco */}
          <mesh position={[0, 0.41, -0.205]} castShadow receiveShadow>
            <boxGeometry args={[0.33, 0.42, 0.16]} />
            {ceramic()}
          </mesh>
          {/* Tapa de la cisterna (sobresale un poco) */}
          <mesh position={[0, 0.625, -0.2]} castShadow>
            <boxGeometry args={[0.36, 0.04, 0.19]} />
            {ceramic()}
          </mesh>
          {/* Botón de descarga */}
          <mesh position={[0, 0.65, -0.2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.012, 24]} />
            <meshStandardMaterial color={selected ? SELECTED : "#c6cace"} metalness={0.4} roughness={0.3} />
          </mesh>
        </group>
      );
    }

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

    case "shelf": {
      // Estantería / mueble auxiliar: CARCASA hueca, no bloque macizo: laterales
      // + techo + base + fondo, y el interior con baldas. Frente abierto para ver
      // el hueco. Se dibuja en tamaño natural; el <group> padre escala a item.size.
      const nat = naturalSize(modelRef);
      const { width: W, height: H, depth: D } = nat;
      const layout = shelfLayout(item.size, nat);
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

      // Puertas opcionales: tapan el frente. Dos hojas si hay divisor (ancho
      // grande), una si no. Cada hoja con un tirador fino en el borde interior.
      const innerW = W - 2 * p;
      const innerH = H - 2 * p;
      const doors: { x: number; handleX: number; w: number }[] = [];
      if (item.doors) {
        if (layout.hasDivider) {
          const dw = innerW / 2 - 0.004;
          doors.push({ x: -(dw / 2 + 0.004), w: dw, handleX: dw / 2 - 0.03 });
          doors.push({ x: dw / 2 + 0.004, w: dw, handleX: -(dw / 2 - 0.03) });
        } else {
          doors.push({ x: 0, w: innerW, handleX: innerW / 2 - 0.03 });
        }
      }

      return (
        <group>
          {panels.map((b, i) => (
            <mesh key={i} position={b.pos} castShadow receiveShadow>
              <boxGeometry args={b.size} />
              {woodMat(b.size[0], b.size[1])}
            </mesh>
          ))}
          {doors.map((d, i) => (
            <group key={`door-${i}`}>
              <mesh position={[d.x, H / 2, D / 2]} castShadow receiveShadow>
                <boxGeometry args={[d.w, innerH, 0.02]} />
                {woodMat(d.w, innerH)}
              </mesh>
              {/* tirador */}
              <mesh position={[d.x + d.handleX, H / 2, D / 2 + 0.013]}>
                <boxGeometry args={[0.014, innerH * 0.28, 0.014]} />
                <meshStandardMaterial color={selected ? SELECTED : "#4a3c28"} />
              </mesh>
            </group>
          ))}
        </group>
      );
    }

    case "cabinet":
    default: {
      // Mueble de lavabo: patas metálicas + cuerpo de 3 cajones (roble) con
      // uñero, y encimera con lavabo blanco integrado. Se dibuja en tamaño
      // natural (base en y=0); el <group> padre escala a item.size.
      const { width: W, depth: D, legHeight: legH, bodyHeight: bodyH } = VANITY;
      const bodyBase = legH;
      const bodyTop = legH + bodyH;
      // Encimera/lavabo y patas tienen su propio material; la madera (cuerpo y
      // frentes) sale de woodMat (textura o color). Al seleccionar, todo ACCENT.
      const white = selected ? SELECTED : "#f3f2ee";
      const metal = selected ? SELECTED : "#9aa0a6";

      const drawers = drawerLayout(bodyH, DRAWER_RATIOS);
      const gap = 0.006; // separación visible entre frentes de cajón
      const legInset = 0.06;
      const lx = W / 2 - legInset;
      const lz = D / 2 - legInset;

      // Encimera con lavabo PLANO (un "plato"): NO un bol que sobresale, sino
      // un marco de 4 barras alrededor de un seno rectangular hundido y poco
      // profundo. La encimera sobresale un poco del cuerpo (voladizo).
      const ct = 0.05; // grosor de la encimera
      const EW = W + 0.02; // voladizo lateral
      const ED = D + 0.03; // voladizo frontal
      const sw = W * 0.52; // ancho del seno
      const sd = D * 0.48; // fondo del seno
      const sz = -0.01; // seno apenas hacia atrás (grifería detrás)
      const sinkDepth = 0.035; // cuán hundido (poco: es plano)
      const ez = ED / 2;
      const ex = EW / 2;
      const iz0 = sz - sd / 2;
      const iz1 = sz + sd / 2;
      const ix = sw / 2;
      // 4 barras del marco: detrás, delante, izquierda, derecha del seno.
      const counterBars = [
        { cx: 0, cz: (-ez + iz0) / 2, w: EW, d: iz0 + ez },
        { cx: 0, cz: (iz1 + ez) / 2, w: EW, d: ez - iz1 },
        { cx: (-ex - ix) / 2, cz: sz, w: ex - ix, d: sd },
        { cx: (ix + ex) / 2, cz: sz, w: ex - ix, d: sd },
      ];

      return (
        <group>
          {/* Patas (4 esquinas) */}
          {[
            [-lx, -lz],
            [lx, -lz],
            [-lx, lz],
            [lx, lz],
          ].map(([x, z], i) => (
            <mesh key={`leg-${i}`} position={[x, legH / 2, z]} castShadow>
              <boxGeometry args={[0.04, legH, 0.04]} />
              <meshStandardMaterial color={metal} metalness={0.6} roughness={0.4} />
            </mesh>
          ))}

          {/* Carcasa del cuerpo (madera un punto más oscura sin textura: deja ver
              la junta entre frentes) */}
          <mesh position={[0, bodyBase + bodyH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[W, bodyH, D]} />
            {woodMat(W, bodyH, "#c2a673")}
          </mesh>

          {/* Frentes de cajón (sobresalen un poco) + uñero en los dos de abajo */}
          {drawers.map((dr, i) => {
            const yc = bodyBase + dr.y;
            return (
              <group key={`dr-${i}`}>
                <mesh position={[0, yc, D / 2]} castShadow>
                  <boxGeometry args={[W - 0.01, dr.height - gap, 0.03]} />
                  {woodMat(W - 0.01, dr.height - gap)}
                </mesh>
                {i > 0 && (
                  // Uñero: ranura oscura horizontal cerca del borde superior,
                  // corrida a la derecha como en la foto.
                  <mesh position={[W * 0.12, yc + dr.height / 2 - 0.03, D / 2 + 0.016]}>
                    <boxGeometry args={[W * 0.5, 0.014, 0.006]} />
                    <meshStandardMaterial color={selected ? SELECTED : "#4a3c28"} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* Encimera: marco plano de 4 barras alrededor del seno */}
          {counterBars.map((b, i) => (
            <mesh
              key={`counter-${i}`}
              position={[b.cx, bodyTop + ct / 2, b.cz]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[b.w, ct, b.d]} />
              <meshStandardMaterial color={white} />
            </mesh>
          ))}
          {/* Fondo del seno (hundido y plano) */}
          <mesh position={[0, bodyTop + ct - sinkDepth, sz]} receiveShadow>
            <boxGeometry args={[sw, 0.02, sd]} />
            <meshStandardMaterial color={white} />
          </mesh>
          {/* Desagüe */}
          <mesh position={[0, bodyTop + ct - sinkDepth + 0.012, sz]}>
            <cylinderGeometry args={[0.018, 0.018, 0.004, 16]} />
            <meshStandardMaterial
              color={selected ? SELECTED : "#aab0b5"}
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
        </group>
      );
    }
  }
}
