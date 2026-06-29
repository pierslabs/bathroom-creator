/**
 * La escena 3D. Monta el Canvas de R3F, las luces, la grilla de referencia y
 * la cámara orbital. Compone Floor + Walls, que leen del store por su cuenta.
 */
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Floor } from "./Floor";
import { Walls } from "./Walls";
import { Items } from "./Items";
import { useDesignStore } from "../state/designStore";

// Centro aproximado del baño en L por defecto, para apuntar la cámara.
const TARGET: [number, number, number] = [1.8, 1, -1.5];

export function BathroomScene() {
  const selectItem = useDesignStore((s) => s.selectItem);

  return (
    <Canvas
      shadows
      // flat = NoToneMapping: colores fieles a la foto (sin filtro ACES).
      flat
      // demand = solo redibuja cuando algo cambia (cámara, edición, drag). En
      // reposo no consume GPU: sin esto, R3F renderiza a 60fps eternamente y
      // mantiene la GPU al palo (ventiladores) con la escena quieta.
      frameloop="demand"
      camera={{ position: [5, 5, 5], fov: 50 }}
      // Click en el vacío (no sobre un item) -> deselecciona.
      onPointerMissed={() => selectItem(null)}
    >
      <color attach="background" args={["#000000"]} />

      {/* Luz pareja para que la textura muestre su color real, + una
          direccional suave que da sombras sin oscurecer de más. */}
      <ambientLight intensity={1.0} />
      <hemisphereLight args={["#ffffff", "#c8c0b0", 0.6]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <Suspense fallback={null}>
        <Floor />
        <Walls />
        <Items />
      </Suspense>

      <Grid
        infiniteGrid
        cellSize={0.5}
        sectionSize={2}
        sectionColor="#555"
        cellColor="#333"
        fadeDistance={30}
      />

      <OrbitControls makeDefault target={TARGET} />
    </Canvas>
  );
}
