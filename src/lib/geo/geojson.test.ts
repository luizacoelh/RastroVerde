import { describe, expect, it } from "vitest";
import { lerTalhaoGeoJSON, listarFeicoes } from "./geojson";

const POLIGONO = {
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

const feature = (geometry: unknown, properties: Record<string, unknown> = {}) => ({ type: "Feature", properties, geometry });

describe("lerTalhaoGeoJSON (RF07)", () => {
  it.each([
    ["FeatureCollection", { type: "FeatureCollection", features: [feature(POLIGONO)] }],
    ["Feature", feature(POLIGONO)],
    ["Geometry", POLIGONO],
    ["crs CRS84 (QGIS)", { type: "FeatureCollection", crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } }, features: [feature(POLIGONO)] }],
  ])("aceita %s", (_, geojson) => {
    const r = lerTalhaoGeoJSON(JSON.stringify(geojson));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.areaHa).toBeCloseTo(120.4, 0);
  });

  it("ignora feições que não são polígonos", () => {
    const geojson = { type: "FeatureCollection", features: [feature({ type: "Point", coordinates: [-45.8, -12.1] }), feature(POLIGONO)] };
    expect(lerTalhaoGeoJSON(JSON.stringify(geojson)).ok).toBe(true);
  });

  it.each([
    ["texto que não é JSON", "{ isto não é json", "não é um GeoJSON válido"],
    ["JSON sem tipo", JSON.stringify({ a: 1 }), "não é um GeoJSON válido"],
    ["sem polígono", JSON.stringify(feature({ type: "Point", coordinates: [0, 0] })), "nenhum polígono"],
    [
      "dois polígonos",
      JSON.stringify({ type: "FeatureCollection", features: [feature(POLIGONO), feature(POLIGONO)] }),
      "tem 2 polígonos",
    ],
    [
      "outro sistema de coordenadas",
      JSON.stringify({ type: "FeatureCollection", crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::31983" } }, features: [feature(POLIGONO)] }),
      "EPSG::31983",
    ],
    [
      "coordenadas UTM sem crs",
      JSON.stringify({ type: "Polygon", coordinates: [[[500000, 8660000], [501000, 8660000], [501000, 8661000], [500000, 8660000]]] }),
      "WGS 84",
    ],
    [
      "polígono que se cruza",
      JSON.stringify({ type: "Polygon", coordinates: [[[-45.8, -12.1], [-45.79, -12.09], [-45.79, -12.1], [-45.8, -12.09], [-45.8, -12.1]]] }),
      "auto-interseção",
    ],
  ])("recusa %s", (_, texto, mensagem) => {
    const r = lerTalhaoGeoJSON(texto);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain(mensagem);
  });
});

describe("listarFeicoes", () => {
  it("devolve propriedades de cada feição", () => {
    const r = listarFeicoes({ type: "FeatureCollection", features: [feature(POLIGONO, { DATADETEC: "2023-01-01" })] });
    expect(r).toEqual([{ geometria: POLIGONO, propriedades: { DATADETEC: "2023-01-01" } }]);
  });

  it("recusa entradas que não são objetos", () => {
    expect(listarFeicoes(null)).toContain("não é um GeoJSON");
    expect(listarFeicoes({ type: "FeatureCollection", features: 1 })).toContain("não é um GeoJSON");
  });
});
