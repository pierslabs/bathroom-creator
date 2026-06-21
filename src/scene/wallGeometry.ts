/**
 * Construcción del SÓLIDO de un tramo de pared como prisma propio.
 *
 * ¿Por qué no un boxGeometry? Porque una caja tiene sección rectangular
 * constante: sus extremos son caras perpendiculares al eje. Pero en una esquina
 * dos paredes se cortan en INGLETE (mitre), y un extremo cortado en ángulo ya
 * no es un rectángulo. Aquí la planta del tramo es un cuadrilátero arbitrario
 * (l0,r0,l1,r1) — las esquinas con inglete vienen de miterCorners (dominio).
 *
 * l/r = los dos lados del muro (left/right del contorno); 0/1 = inicio/fin del
 * tramo a lo largo de la pared. Todo en coordenadas de MUNDO [x, z].
 *
 * UV: en las dos caras largas, u corre a lo largo de la pared y v en altura, de
 * 0 a 1; TileMaterial multiplica por el repeat real del azulejo. Las tapas y el
 * techo/piso del tramo llevan UV trivial (casi no se ven).
 */
import * as THREE from "three";

type XZ = [number, number];

export function buildWallPrism(
  l0: XZ,
  r0: XZ,
  l1: XZ,
  r1: XZ,
  bottom: number,
  top: number,
): THREE.BufferGeometry {
  // 8 vértices del prisma: 4 de planta × 2 alturas.
  const v = (p: XZ, y: number): [number, number, number] => [p[0], y, p[1]];
  const l0b = v(l0, bottom);
  const r0b = v(r0, bottom);
  const l1b = v(l1, bottom);
  const r1b = v(r1, bottom);
  const l0t = v(l0, top);
  const r0t = v(r0, top);
  const l1t = v(l1, top);
  const r1t = v(r1, top);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Agrega un quad (a,b,c,d en orden) con sus UV; vértices NO compartidos para
  // que cada cara tenga normal plana propia (computeVertexNormals).
  const quad = (
    a: number[],
    b: number[],
    c: number[],
    d: number[],
    uv: [number, number][],
  ) => {
    const base = positions.length / 3;
    for (const p of [a, b, c, d]) positions.push(p[0], p[1], p[2]);
    for (const t of uv) uvs.push(t[0], t[1]);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const UV: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  // Caras largas (las que llevan azulejo): u a lo largo, v en altura.
  quad(l0b, l1b, l1t, l0t, UV); // lado izquierdo
  quad(r0b, r1b, r1t, r0t, UV); // lado derecho
  // Tapas de los extremos (inglete).
  quad(l0b, r0b, r0t, l0t, UV); // inicio
  quad(l1b, r1b, r1t, l1t, UV); // fin
  // Techo y piso del tramo.
  quad(l0t, l1t, r1t, r0t, UV);
  quad(l0b, l1b, r1b, r0b, UV);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
