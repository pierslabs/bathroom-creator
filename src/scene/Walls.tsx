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
import type { ThreeEvent } from "@react-three/fiber";
import { useDesignStore } from "../state/designStore";
import { wallSegments, wallParts, type WallSegment } from "../domain/geometry";
import { TileMaterial } from "./TileMaterial";
import { toWorldXZ } from "./coords";
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

function Wall({ seg, selected }: { seg: WallSegment; selected: boolean }) {
  const materials = useDesignStore((s) => s.design.materials);
  const selectWall = useDesignStore((s) => s.selectWall);

  // Mapeo dominio -> mundo (z = -y), centralizado en coords.ts.
  const [ax, az] = toWorldXZ(seg.start);
  const [bx, bz] = toWorldXZ(seg.end);

  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  const angleY = -Math.atan2(dz, dx);
  // Vector unitario a lo largo de la pared, para ubicar cada tramo.
  const ux = length ? dx / length : 1;
  const uz = length ? dz / length : 0;

  const material = seg.materialId ? materials[seg.materialId] : null;
  // La pared con huecos se descompone en tramos macizos.
  const parts = wallParts(length, seg.height, seg.openings);

  // Transparencia manual: solo si la marcaste.
  const fade = seg.transparent === true;

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
      {parts.map((part, i) => {
        const s = part.start + part.length / 2; // centro del tramo a lo largo
        return (
          <mesh
            key={i}
            position={[ax + ux * s, part.bottom + part.height / 2, az + uz * s]}
            rotation={[0, angleY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[part.length, part.height, seg.thickness]} />
            {material ? (
              <TileMaterial
                src={material.src}
                repeatX={part.length / material.tileWidth}
                repeatY={part.height / material.tileHeight}
                highlight={selected && !fade}
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

  return (
    <>
      {segments.map((seg) => (
        <Wall key={seg.index} seg={seg} selected={selectedWall === seg.index} />
      ))}
    </>
  );
}
