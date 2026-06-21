import { describe, it, expect } from "vitest";
import type { Design } from "./types";
import {
  wallSegments,
  signedArea,
  floorArea,
  wallLength,
  wallParts,
  miterCorners,
  clampRegion,
} from "./geometry";

/**
 * Baño en L (como el croquis): un cuadrado de 2x2 al que le falta una esquina
 * de 1x1 arriba a la izquierda. Área esperada = 4 - 1 = 3 m².
 *
 *   (0,2)---(1,2)
 *     |       |
 *   (0,1)   (1,2)... el contorno real, en sentido horario, es:
 */
function makeLShapedDesign(): Design {
  const points = [
    { x: 0, y: 0 }, // 0  esquina inferior izquierda
    { x: 2, y: 0 }, // 1  inferior derecha
    { x: 2, y: 2 }, // 2  superior derecha
    { x: 1, y: 2 }, // 3  entrante (arranca el escalón)
    { x: 1, y: 1 }, // 4  baja el escalón
    { x: 0, y: 1 }, // 5  vuelve al borde izquierdo
  ];
  const wall = () => ({
    height: 2.4,
    thickness: 0.1,
    materialId: null,
    openings: [],
  });
  return {
    points,
    walls: points.map(wall),
    items: [],
    materials: {},
    floorMaterialId: null,
  };
}

describe("wallSegments", () => {
  it("deriva una pared por cada arista, cerrando el polígono", () => {
    const design = makeLShapedDesign();
    const segs = wallSegments(design);

    // 6 puntos -> 6 paredes (el polígono cierra).
    expect(segs).toHaveLength(6);

    // La primera pared va del punto 0 al punto 1.
    expect(segs[0].start).toEqual({ x: 0, y: 0 });
    expect(segs[0].end).toEqual({ x: 2, y: 0 });

    // La última pared cierra: del último punto de vuelta al primero.
    expect(segs[5].start).toEqual({ x: 0, y: 1 });
    expect(segs[5].end).toEqual({ x: 0, y: 0 });
  });

  it("propaga las propiedades de cada pared (ej. un murito)", () => {
    const design = makeLShapedDesign();
    design.walls[3].height = 1.1; // el murito
    const segs = wallSegments(design);
    expect(segs[3].height).toBe(1.1);
  });

  it("propaga las zonas de revestimiento al segmento (si no, no se dibujan)", () => {
    const design = makeLShapedDesign();
    design.walls[2].tileRegions = [
      { offset: 0.2, width: 0.5, bottom: 0, height: 1, materialId: "m1" },
    ];
    const segs = wallSegments(design);
    expect(segs[2].tileRegions).toHaveLength(1);
    expect(segs[2].tileRegions?.[0].materialId).toBe("m1");
  });
});

describe("signedArea / floorArea", () => {
  it("calcula el área del polígono en L (shoelace)", () => {
    const design = makeLShapedDesign();
    expect(floorArea(design)).toBeCloseTo(3);
  });

  it("signedArea es negativa para contorno horario, positiva para antihorario", () => {
    const design = makeLShapedDesign();
    const cw = signedArea(design.points);
    const ccw = signedArea([...design.points].reverse());
    expect(Math.sign(cw)).toBe(-Math.sign(ccw));
    expect(Math.abs(cw)).toBeCloseTo(Math.abs(ccw));
  });
});

describe("wallLength", () => {
  it("mide la longitud de una arista", () => {
    const design = makeLShapedDesign();
    const segs = wallSegments(design);
    expect(wallLength(segs[0])).toBeCloseTo(2); // (0,0)->(2,0)
    expect(wallLength(segs[4])).toBeCloseTo(1); // (1,1)->(0,1)
  });
});

describe("miterCorners", () => {
  // Cuadrado 2x2 antihorario, muros de 0.2 (offset 0.1 a cada lado del eje).
  const square = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];

  it("resuelve la esquina recta como inglete a 45° (interior y exterior)", () => {
    const corners = miterCorners(square, [0.2, 0.2, 0.2, 0.2]);
    // Vértice (2,0): pared a (eje x) y pared b (eje y) de grosor 0.2.
    // Lado izquierdo (interior, recorrido CCW) = (1.9, 0.1);
    // lado derecho (exterior) = (2.1, -0.1).
    expect(corners[1].left.x).toBeCloseTo(1.9);
    expect(corners[1].left.y).toBeCloseTo(0.1);
    expect(corners[1].right.x).toBeCloseTo(2.1);
    expect(corners[1].right.y).toBeCloseTo(-0.1);
  });

  it("el contorno interior cierra un cuadrado de 1.8 y el exterior de 2.2", () => {
    const corners = miterCorners(square, [0.2, 0.2, 0.2, 0.2]);
    const inner = corners.map((c) => c.left);
    const outer = corners.map((c) => c.right);
    expect(inner[0]).toMatchObject({ x: expect.closeTo(0.1), y: expect.closeTo(0.1) });
    expect(inner[2]).toMatchObject({ x: expect.closeTo(1.9), y: expect.closeTo(1.9) });
    expect(outer[0]).toMatchObject({ x: expect.closeTo(-0.1), y: expect.closeTo(-0.1) });
    expect(outer[2]).toMatchObject({ x: expect.closeTo(2.1), y: expect.closeTo(2.1) });
  });

  it("respeta grosores distintos en cada pared al cortar el inglete", () => {
    // Pared 0 (eje x) grosor 0.2; pared 1 (eje y) grosor 0.4.
    const corners = miterCorners(square, [0.2, 0.4, 0.2, 0.2]);
    // En (2,0): el offset interior usa la pared a en y (0.1) y la pared b en x (0.2).
    expect(corners[1].left.x).toBeCloseTo(1.8); // 2 - 0.4/2
    expect(corners[1].left.y).toBeCloseTo(0.1); // 0 + 0.2/2
    expect(corners[1].right.x).toBeCloseTo(2.2);
    expect(corners[1].right.y).toBeCloseTo(-0.1);
  });

  it("paredes colineales: cae al offset perpendicular (sin intersección)", () => {
    // Tres puntos en línea recta sobre el eje x; el del medio no dobla.
    const collinear = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const corners = miterCorners(collinear, [0.2, 0.2, 0.2]);
    // En (1,0) no hay codo: la esquina es el simple offset ±0.1 en y.
    expect(corners[1].left.x).toBeCloseTo(1);
    expect(corners[1].left.y).toBeCloseTo(0.1);
    expect(corners[1].right.y).toBeCloseTo(-0.1);
  });
});

describe("clampRegion", () => {
  const region = (p: Partial<Parameters<typeof clampRegion>[0]>) => ({
    offset: 0,
    width: 1,
    bottom: 0,
    height: 1,
    materialId: "m",
    ...p,
  });

  it("una zona que entra entera no se modifica", () => {
    const r = clampRegion(region({ offset: 1, width: 1, bottom: 0.5, height: 1 }), 4, 2.4);
    expect(r).toEqual({ start: 1, width: 1, bottom: 0.5, height: 1 });
  });

  it("recorta el ancho para que no sobresalga del largo de la pared", () => {
    const r = clampRegion(region({ offset: 3, width: 2 }), 4, 2.4);
    expect(r.start).toBe(3);
    expect(r.width).toBe(1); // 4 - 3
  });

  it("recorta el alto para que no pase del techo", () => {
    const r = clampRegion(region({ bottom: 2, height: 1 }), 4, 2.4);
    expect(r.bottom).toBe(2);
    expect(r.height).toBeCloseTo(0.4); // 2.4 - 2
  });

  it("offset negativo o fuera de rango se pega al límite", () => {
    const r = clampRegion(region({ offset: -1, width: 5 }), 4, 2.4);
    expect(r.start).toBe(0);
    expect(r.width).toBe(4);
  });
});

describe("wallParts", () => {
  it("sin huecos: una pared maciza de punta a punta", () => {
    const parts = wallParts(4, 2.4, []);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual({ start: 0, length: 4, bottom: 0, height: 2.4 });
  });

  it("una puerta: pilar izq + dintel + pilar der (el hueco queda vacío)", () => {
    // Puerta en offset 1.5, ancho 0.9, alto 2.0, sill 0 (llega al piso).
    const parts = wallParts(4, 2.4, [
      { offset: 1.5, width: 0.9, height: 2.0, sill: 0 },
    ]);
    expect(parts).toHaveLength(3);
    // pilar izquierdo, de altura completa
    expect(parts[0]).toEqual({ start: 0, length: 1.5, bottom: 0, height: 2.4 });
    // dintel encima del hueco: arranca a 2.0 y sube hasta 2.4
    expect(parts[1].bottom).toBeCloseTo(2.0);
    expect(parts[1].height).toBeCloseTo(0.4);
    expect(parts[1].length).toBeCloseTo(0.9);
    // pilar derecho
    expect(parts[2].start).toBeCloseTo(2.4);
    expect(parts[2].height).toBeCloseTo(2.4);
  });

  it("una ventana (sill > 0) agrega también el tramo inferior", () => {
    const parts = wallParts(4, 2.4, [
      { offset: 1.5, width: 1.0, height: 1.0, sill: 1.0 },
    ]);
    // pilar izq + antepecho + dintel + pilar der
    expect(parts).toHaveLength(4);
    const sill = parts.find((p) => p.start === 1.5 && p.bottom === 0);
    expect(sill?.height).toBeCloseTo(1.0); // antepecho de 0 a 1.0
  });
});
