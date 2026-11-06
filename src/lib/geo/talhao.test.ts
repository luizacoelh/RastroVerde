import { describe, expect, it } from "vitest";
import type { Polygon } from "geojson";
import { calcularAreaHa, calcularCentroide, formatarHa, validarGeometriaTalhao } from "./talhao";

// Quadrado de 0,01° × 0,01° perto de Luís Eduardo Magalhães (BA), lat ≈ -12°.
// Largura ≈ 1,089 km × altura ≈ 1,106 km → ≈ 120 ha.
const QUADRADO: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-45.8, -12.1],
      [-45.79, -12.1],
      [-45.79, -12.09],
      [-45.8, -12.09],
      [-45.8, -12.1],
    ],
  ],
};

function quadrado(ladoGraus: number): Polygon {
  const [x, y] = [-45.8, -12.1];
  return {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + ladoGraus, y],
        [x + ladoGraus, y + ladoGraus],
        [x, y + ladoGraus],
        [x, y],
      ],
    ],
  };
}

describe("validarGeometriaTalhao", () => {
  it("aceita um polígono simples e calcula área e bbox", () => {
    const r = validarGeometriaTalhao(QUADRADO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.areaHa).toBeGreaterThan(119);
    expect(r.areaHa).toBeLessThan(122);
    expect(r.bbox).toEqual([-45.8, -12.1, -45.79, -12.09]);
  });

  it("recusa polígono com auto-interseção (gravata-borboleta)", () => {
    const r = validarGeometriaTalhao({
      type: "Polygon",
      coordinates: [
        [
          [-45.8, -12.1],
          [-45.79, -12.09],
          [-45.79, -12.1],
          [-45.8, -12.09],
          [-45.8, -12.1],
        ],
      ],
    });
    expect(r).toEqual({ ok: false, erro: expect.stringMatching(/auto-interseção/) });
  });

  it("recusa polígono não fechado", () => {
    const r = validarGeometriaTalhao({
      type: "Polygon",
      coordinates: [
        [
          [-45.8, -12.1],
          [-45.79, -12.1],
          [-45.79, -12.09],
          [-45.8, -12.09],
        ],
      ],
    });
    expect(r).toEqual({ ok: false, erro: expect.stringMatching(/não está fechado/) });
  });

  it("recusa anel com menos de 3 vértices", () => {
    const r = validarGeometriaTalhao({
      type: "Polygon",
      coordinates: [
        [
          [-45.8, -12.1],
          [-45.79, -12.1],
          [-45.8, -12.1],
        ],
      ],
    });
    expect(r).toEqual({ ok: false, erro: expect.stringMatching(/3 vértices/) });
  });

  it("recusa área abaixo de 0,1 ha", () => {
    // 0,0002° ≈ 22 m de lado → ≈ 0,05 ha
    const r = validarGeometriaTalhao(quadrado(0.0002));
    expect(r).toEqual({ ok: false, erro: expect.stringMatching(/muito pequena/) });
  });

  it("recusa área acima de 10.000 ha", () => {
    // 0,1° ≈ 11 km de lado → ≈ 12.000 ha
    const r = validarGeometriaTalhao(quadrado(0.1));
    expect(r).toEqual({ ok: false, erro: expect.stringMatching(/muito grande/) });
  });

  it("aceita perto dos limites", () => {
    // 0,0003° ≈ 33 m → ≈ 0,11 ha; 0,09° ≈ 9,8 km → ≈ 9.750 ha
    expect(validarGeometriaTalhao(quadrado(0.0003)).ok).toBe(true);
    expect(validarGeometriaTalhao(quadrado(0.09)).ok).toBe(true);
  });

  it("recusa coordenadas fora de WGS 84", () => {
    const r = validarGeometriaTalhao({
      type: "Polygon",
      coordinates: [
        [
          [500000, 8660000],
          [501000, 8660000],
          [501000, 8661000],
          [500000, 8660000],
        ],
      ],
    });
    expect(r).toEqual({ ok: false, erro: expect.stringMatching(/WGS 84/) });
  });

  it.each([
    null,
    "texto",
    { type: "Point", coordinates: [-45.8, -12.1] },
    { type: "LineString", coordinates: [[-45.8, -12.1], [-45.79, -12.1]] },
    { type: "Polygon" },
    { type: "Polygon", coordinates: [] },
    { type: "Polygon", coordinates: [["x"]] },
    { type: "MultiPolygon", coordinates: [] },
  ])("recusa geometria inválida: %j", (entrada) => {
    expect(validarGeometriaTalhao(entrada).ok).toBe(false);
  });

  it("descarta altitude (3ª coordenada)", () => {
    const comAltitude = {
      type: "Polygon",
      coordinates: [QUADRADO.coordinates[0].map(([x, y]) => [x, y, 450])],
    };
    const r = validarGeometriaTalhao(comAltitude);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.geometria).toEqual(QUADRADO);
  });

  it("aceita MultiPolygon e soma as áreas", () => {
    const outro = quadrado(0.01);
    outro.coordinates[0] = outro.coordinates[0].map(([x, y]) => [x + 0.05, y]);
    const r = validarGeometriaTalhao({
      type: "MultiPolygon",
      coordinates: [QUADRADO.coordinates, outro.coordinates],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.areaHa).toBeCloseTo(2 * calcularAreaHa(QUADRADO), 0);
    expect(r.bbox).toEqual([-45.8, -12.1, -45.74, -12.09]);
  });

  it("recusa MultiPolygon com uma parte inválida", () => {
    const r = validarGeometriaTalhao({
      type: "MultiPolygon",
      coordinates: [QUADRADO.coordinates, [[[-45.8, -12.1], [-45.79, -12.1]]]],
    });
    expect(r.ok).toBe(false);
  });

  it("aceita polígono com furo", () => {
    const furo = [
      [-45.797, -12.097],
      [-45.797, -12.093],
      [-45.793, -12.093],
      [-45.793, -12.097],
      [-45.797, -12.097],
    ];
    const r = validarGeometriaTalhao({
      type: "Polygon",
      coordinates: [QUADRADO.coordinates[0], furo],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.areaHa).toBeLessThan(calcularAreaHa(QUADRADO));
  });
});

describe("formatarHa", () => {
  it("usa vírgula decimal e separador de milhar do pt-BR", () => {
    expect(formatarHa(1234.567)).toBe("1.234,57 ha");
    expect(formatarHa(0.1)).toBe("0,1 ha");
  });
});

describe("calcularCentroide (RF15)", () => {
  const quadrado = (x: number, y: number, l: number) => [
    [x, y],
    [x + l, y],
    [x + l, y + l],
    [x, y + l],
    [x, y],
  ];

  it("centro de um quadrado, nos dois sentidos de giro", () => {
    const anel = quadrado(-45.8, -12.1, 0.01);
    for (const a of [anel, [...anel].reverse()]) {
      const [lng, lat] = calcularCentroide({ type: "Polygon", coordinates: [a] });
      expect(lng).toBeCloseTo(-45.795, 6);
      expect(lat).toBeCloseTo(-12.095, 6);
    }
  });

  it("buraco descentralizado desloca o centroide para o outro lado", () => {
    const [lng] = calcularCentroide({
      type: "Polygon",
      coordinates: [quadrado(0, 0, 1), quadrado(0.6, 0.4, 0.2)],
    });
    expect(lng).toBeLessThan(0.5);
  });

  it("MultiPolygon pondera pela área", () => {
    const [lng, lat] = calcularCentroide({
      type: "MultiPolygon",
      coordinates: [[quadrado(0, 0, 1)], [quadrado(3, 0, 1)]],
    });
    expect(lng).toBeCloseTo(2, 3);
    expect(lat).toBeCloseTo(0.5, 3);
  });
});
