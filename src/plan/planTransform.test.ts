import { describe, it, expect } from "vitest";
import type { Point2 } from "../domain/types";
import { computeTransform, toPx, toDomain, snap, PAD } from "./planTransform";

const RECT: Point2[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
];

describe("computeTransform", () => {
  it("escala para entrar en el SVG con padding y respeta el aspecto", () => {
    const t = computeTransform(RECT);
    expect(t.scale).toBeGreaterThan(0);
    // Un punto extremo no debe pasarse del área útil (lado limitante).
    const far = toPx(t, { x: 4, y: 3 });
    expect(far.x).toBeLessThanOrEqual(300 - PAD + 0.001);
    expect(far.y).toBeLessThanOrEqual(260 - PAD + 0.001);
  });

  it("no divide por cero con un polígono degenerado (un punto)", () => {
    const t = computeTransform([{ x: 1, y: 1 }]);
    expect(Number.isFinite(t.scale)).toBe(true);
  });
});

describe("toPx / toDomain", () => {
  it("son inversas: toDomain(toPx(p)) ≈ p", () => {
    const t = computeTransform(RECT);
    for (const p of RECT) {
      const q = toPx(t, p);
      const back = toDomain(t, q.x, q.y);
      expect(back.x).toBeCloseTo(p.x);
      expect(back.y).toBeCloseTo(p.y);
    }
  });

  it("invierte Y: dominio-arriba (mayor y) = pantalla-arriba (menor py)", () => {
    const t = computeTransform(RECT);
    const low = toPx(t, { x: 0, y: 0 });
    const high = toPx(t, { x: 0, y: 3 });
    expect(high.y).toBeLessThan(low.y);
  });
});

describe("snap", () => {
  it("ajusta a la grilla de 5cm", () => {
    expect(snap(1.23)).toBeCloseTo(1.25);
    expect(snap(1.21)).toBeCloseTo(1.2);
  });
});
