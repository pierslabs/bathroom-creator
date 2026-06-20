/**
 * Piso del baño. Es un POLÍGONO, no un rectángulo: se construye con
 * THREE.Shape a partir del contorno del dominio y se triangula con
 * ShapeGeometry. Por eso una planta en L sale sola.
 *
 * Bonus: ShapeGeometry genera los UVs en METROS (las propias coords del
 * polígono), así que para azulejos el repeat es 1 / tileSize y la textura
 * mantiene su escala física sin importar el tamaño del baño.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useDesignStore } from "../state/designStore";
import { TileMaterial } from "./TileMaterial";

export function Floor() {
  const points = useDesignStore((s) => s.design.points);
  const floorMaterialId = useDesignStore((s) => s.design.floorMaterialId);
  const materials = useDesignStore((s) => s.design.materials);
  const floorSelected = useDesignStore((s) => s.floorSelected);
  const selectFloor = useDesignStore((s) => s.selectFloor);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    points.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    });
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    // El Shape vive en el plano XY; lo acostamos al plano XZ (horizontal).
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [points]);

  const material = floorMaterialId ? materials[floorMaterialId] : null;

  return (
    <mesh
      geometry={geometry}
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        selectFloor();
      }}
    >
      {material ? (
        <TileMaterial
          src={material.src}
          repeatX={1 / material.tileWidth}
          repeatY={1 / material.tileHeight}
          highlight={floorSelected}
          doubleSide
        />
      ) : (
        <meshStandardMaterial
          color={floorSelected ? "#c9bfe0" : "#d8d4cc"}
          emissive={floorSelected ? "#c084fc" : "#000000"}
          emissiveIntensity={floorSelected ? 0.25 : 0}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}
