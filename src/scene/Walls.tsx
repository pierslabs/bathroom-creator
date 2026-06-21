/**
 * Paredes. Cada pared es un box derivado de un WallSegment del dominio.
 * No hay geometría almacenada: se calcula posición/rotación/largo desde los
 * dos puntos del contorno. El murito (height bajo) sale gratis.
 *
 * Cada pared es su propio componente para poder cargar su textura de azulejos
 * y calcular el repeat según su largo y alto reales.
 *
 * Transparencia: 100% manual y predecible. Una pared se ve transparente solo
 * si la marcaste (seg.transparent). Sin desvanecido automático por cámara, que
 * peleaba con el control manual.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useDesignStore } from "../state/designStore";
import {
  wallSegments,
  wallParts,
  miterCorners,
  type WallSegment,
  type Corner,
} from "../domain/geometry";
import type { Point2 } from "../domain/types";
import { TileMaterial } from "./TileMaterial";
import { toWorldXZ } from "./coords";
import { buildWallPrism } from "./wallGeometry";
import { ACCENT } from "./theme";

const FRAME_COLOR = "#f3efe6";
const FRAME_T = 0.06; // ancho visible del marco (jamba/dintel), en metros
const FADE_OPACITY = 0.15;

/**
 * Marco del hueco: jambas (lados) + dintel (arriba) + alféizar (abajo, solo
 * ventanas). Cajitas finas que bordean la abertura. Es geometría de RENDER
 * derivada del Opening; el dominio solo dice dónde está el hueco.
 */
function Frames({
  seg,
  ax,
  az,
  ux,
  uz,
  angleY,
  fade,
}: {
  seg: WallSegment;
  ax: number;
  az: number;
  ux: number;
  uz: number;
  angleY: number;
  fade: boolean;
}) {
  const depth = seg.thickness + 0.04; // sobresale un poco a cada cara
  return (
    <>
      {seg.openings.flatMap((op, oi) => {
        const left = op.offset;
        const right = op.offset + op.width;
        const sill = Math.max(0, op.sill);
        const top = Math.min(seg.height, op.sill + op.height);
        const h = top - sill;
        if (h <= 0) return [];

        // Cajas locales: s = centro a lo largo de la pared, yc = centro vertical.
        const boxes = [
          { s: left + FRAME_T / 2, yc: sill + h / 2, len: FRAME_T, ht: h }, // jamba izq
          { s: right - FRAME_T / 2, yc: sill + h / 2, len: FRAME_T, ht: h }, // jamba der
          { s: (left + right) / 2, yc: top - FRAME_T / 2, len: op.width, ht: FRAME_T }, // dintel
        ];
        if (sill > 0) {
          // alféizar (solo ventanas)
          boxes.push({
            s: (left + right) / 2,
            yc: sill + FRAME_T / 2,
            len: op.width,
            ht: FRAME_T,
          });
        }

        return boxes.map((b, bi) => (
          <mesh
            key={`${oi}-${bi}`}
            position={[ax + ux * b.s, b.yc, az + uz * b.s]}
            rotation={[0, angleY, 0]}
            castShadow
          >
            <boxGeometry args={[b.len, b.ht, depth]} />
            <meshStandardMaterial
              color={FRAME_COLOR}
              transparent={fade}
              opacity={fade ? FADE_OPACITY : 1}
              depthWrite={!fade}
            />
          </mesh>
        ));
      })}
    </>
  );
}

function Wall({
  seg,
  selected,
  cornerStart,
  cornerEnd,
}: {
  seg: WallSegment;
  selected: boolean;
  cornerStart: Corner;
  cornerEnd: Corner;
}) {
  const materials = useDesignStore((s) => s.design.materials);
  const selectWall = useDesignStore((s) => s.selectWall);

  // Mapeo dominio -> mundo (z = -y), centralizado en coords.ts. Para los Frames
  // (marcos de huecos) seguimos posicionando en mundo con eje + ángulo.
  const [ax, az] = toWorldXZ(seg.start);
  const [bx, bz] = toWorldXZ(seg.end);
  const dx = bx - ax;
  const dz = bz - az;
  const angleY = -Math.atan2(dz, dx);
  const lengthW = Math.hypot(dx, dz);
  const ux = lengthW ? dx / lengthW : 1;
  const uz = lengthW ? dz / lengthW : 0;

  const material = seg.materialId ? materials[seg.materialId] : null;
  const fade = seg.transparent === true;

  // Geometría con INGLETE. Calculamos los tramos y su planta en coordenadas de
  // dominio (x,y), aplicando las esquinas de inglete en los extremos de la
  // pared y un offset perpendicular recto en los cortes internos (huecos).
  const geoms = useMemo(() => {
    const len = Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
    const dirx = len ? (seg.end.x - seg.start.x) / len : 1;
    const diry = len ? (seg.end.y - seg.start.y) / len : 0;
    const nx = -diry; // normal izquierda (rotar dir 90° CCW)
    const ny = dirx;
    const half = seg.thickness / 2;

    // left/right de la franja en una posición local `s` (offset recto).
    const straight = (s: number): Corner => {
      const cx = seg.start.x + dirx * s;
      const cy = seg.start.y + diry * s;
      return {
        left: { x: cx + nx * half, y: cy + ny * half },
        right: { x: cx - nx * half, y: cy - ny * half },
      };
    };
    // En los extremos de la pared usamos el inglete; en el medio, recto.
    const at = (s: number): Corner => {
      if (Math.abs(s) < 1e-9) return cornerStart;
      if (Math.abs(s - len) < 1e-9) return cornerEnd;
      return straight(s);
    };
    const w = (p: Point2): [number, number] => toWorldXZ(p);

    const parts = wallParts(len, seg.height, seg.openings);
    return parts.map((part) => {
      const c0 = at(part.start);
      const c1 = at(part.start + part.length);
      return buildWallPrism(
        w(c0.left),
        w(c0.right),
        w(c1.left),
        w(c1.right),
        part.bottom,
        part.bottom + part.height,
      );
    });
  }, [seg, cornerStart, cornerEnd]);

  // parts en paralelo a geoms (mismo orden) para mapear material/repeat.
  const parts = useMemo(
    () =>
      wallParts(
        Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y),
        seg.height,
        seg.openings,
      ),
    [seg],
  );

  return (
    // Grupo clickeable: elegir la pared directamente en el 3D (no solo en el plano).
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        selectWall(seg.index);
      }}
    >
      {seg.openings.length > 0 && (
        <Frames
          seg={seg}
          ax={ax}
          az={az}
          ux={ux}
          uz={uz}
          angleY={angleY}
          fade={fade}
        />
      )}
      {geoms.map((geom, i) => {
        const part = parts[i];
        return (
          <mesh key={i} geometry={geom} castShadow receiveShadow>
            {material ? (
              <TileMaterial
                src={material.src}
                repeatX={part.length / material.tileWidth}
                repeatY={part.height / material.tileHeight}
                highlight={selected && !fade}
                doubleSide
                transparent={fade}
                opacity={fade ? FADE_OPACITY : 1}
              />
            ) : (
              <meshStandardMaterial
                // key fuerza recrear el material al cambiar transparencia
                // (Three no recompila el blending al togglear `transparent`).
                key={fade ? "fade" : "solid"}
                color={selected && !fade ? "#d8c4f0" : "#e8e4dc"}
                emissive={selected && !fade ? ACCENT : "#000000"}
                emissiveIntensity={selected && !fade ? 0.25 : 0}
                side={THREE.DoubleSide}
                transparent={fade}
                opacity={fade ? FADE_OPACITY : 1}
                depthWrite={!fade}
              />
            )}
          </mesh>
        );
      })}
    </group>
  );
}

export function Walls() {
  const design = useDesignStore((s) => s.design);
  const selectedWall = useDesignStore((s) => s.selectedWall);
  const segments = useMemo(() => wallSegments(design), [design]);
  // Esquinas con inglete: una por vértice del contorno. La esquina `i` es
  // compartida por la pared que LLEGA (i-1) y la que SALE (i) de ese vértice.
  const corners = useMemo(
    () =>
      miterCorners(
        design.points,
        design.walls.map((w) => w.thickness),
      ),
    [design.points, design.walls],
  );
  const n = corners.length;

  return (
    <>
      {segments.map((seg) => (
        <Wall
          key={seg.index}
          seg={seg}
          selected={selectedWall === seg.index}
          cornerStart={corners[seg.index]}
          cornerEnd={corners[(seg.index + 1) % n]}
        />
      ))}
    </>
  );
}
