import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { barraDeEscala, caminhoGeometria, caminhoQRCode, enquadrar } from "./desenho";

// ~1,09 km × 1,1 km perto de LEM
const QUADRADO = {
  type: "Polygon" as const,
  coordinates: [[[-45.8, -12.1], [-45.79, -12.1], [-45.79, -12.09], [-45.8, -12.09], [-45.8, -12.1]]],
};

describe("enquadrar", () => {
  it("cabe na área com margem e mantém a proporção", () => {
    const e = enquadrar([QUADRADO], 400, 200, 10);
    const pontos = QUADRADO.coordinates[0].map(e.projetar);
    const xs = pontos.map((p) => p[0]);
    const ys = pontos.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(10, 1);
    expect(Math.max(...ys)).toBeCloseTo(190, 1);
    const largura = Math.max(...xs) - Math.min(...xs);
    expect(largura / 180).toBeCloseTo(Math.cos((12.095 * Math.PI) / 180), 2);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(200, 1); // centralizado
  });

  it("norte para cima: latitude maior → y menor", () => {
    const e = enquadrar([QUADRADO], 300, 300);
    expect(e.projetar([-45.8, -12.09])[1]).toBeLessThan(e.projetar([-45.8, -12.1])[1]);
  });
});

describe("caminhoGeometria", () => {
  it("um subcaminho fechado por anel", () => {
    const e = enquadrar([QUADRADO], 300, 300);
    const d = caminhoGeometria(
      { type: "MultiPolygon", coordinates: [QUADRADO.coordinates, QUADRADO.coordinates] },
      e,
    );
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
  });
});

describe("barraDeEscala", () => {
  it("comprimento redondo de até 1/4 da largura", () => {
    const e = enquadrar([QUADRADO], 400, 300);
    const b = barraDeEscala(e);
    expect([100, 200, 500, 1000, 2000]).toContain(b.metros);
    expect(b.comprimento).toBeLessThanOrEqual(100);
    expect(b.comprimento).toBeGreaterThan(20);
    expect(b.rotulo).toMatch(/^\d+ (m|km)$/);
  });
});

describe("caminhoQRCode", () => {
  it("um quadrado por módulo escuro, com borda", () => {
    const url = "https://rastroverde.vercel.app/verificar/RV-2026-8F3K2Q";
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
    const escuros = modules.data.reduce((s, v) => s + (v ? 1 : 0), 0);
    const { d, lado } = caminhoQRCode(url);
    expect(lado).toBe(modules.size + 4);
    expect(d.match(/M/g)).toHaveLength(escuros);
    expect(d.startsWith("M2 2h1v1h-1z")).toBe(true); // canto do padrão localizador
  });
});
