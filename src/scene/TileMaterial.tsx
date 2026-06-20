/**
 * Material de azulejos: carga una foto y la repite (wrapping) según el tamaño
 * real del azulejo. El número de repeticiones lo decide quien lo usa (piso o
 * pared), porque depende de las dimensiones de cada superficie.
 *
 * Importante: useLoader CACHEA la textura por URL y devuelve la MISMA instancia.
 * Si dos paredes usan la misma foto y cada una pisara texture.repeat, se
 * pisarían entre sí. Por eso clonamos: el clon comparte la imagen (barato) pero
 * tiene su propio wrap/repeat.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { ACCENT } from "./theme";

export function TileMaterial({
  src,
  repeatX,
  repeatY,
  highlight = false,
  doubleSide = false,
  transparent = false,
  opacity = 1,
}: {
  src: string;
  repeatX: number;
  repeatY: number;
  highlight?: boolean;
  doubleSide?: boolean;
  transparent?: boolean;
  opacity?: number;
}) {
  const texture = useLoader(THREE.TextureLoader, src);

  const map = useMemo(() => {
    const t = texture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.colorSpace = THREE.SRGBColorSpace; // es un mapa de color, no de datos
    t.anisotropy = 8; // nitidez en ángulos rasantes
    t.needsUpdate = true;
    return t;
  }, [texture, repeatX, repeatY]);

  return (
    <meshStandardMaterial
      // key fuerza recrear el material al cambiar transparencia (Three no
      // recompila el blending al togglear `transparent` en caliente).
      key={transparent ? "fade" : "solid"}
      map={map}
      side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}
      emissive={highlight ? ACCENT : "#000000"}
      emissiveIntensity={highlight ? 0.25 : 0}
      transparent={transparent}
      opacity={opacity}
      depthWrite={!transparent}
    />
  );
}
