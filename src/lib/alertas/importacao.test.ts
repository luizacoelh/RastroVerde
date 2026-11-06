import { area } from "@turf/area";
import { describe, expect, it } from "vitest";
import { lerDataDeteccao, prepararAlertas, prepararCobertura, repararGeometria } from "./importacao";

function quadrado(lng0: number, lat0: number, lng1: number, lat1: number) {
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng0, lat0],
        [lng1, lat0],
        [lng1, lat1],
        [lng0, lat1],
        [lng0, lat0],
      ],
    ],
  };
}

const feature = (geometry: unknown, properties: Record<string, unknown> | null = {}) => ({ type: "Feature", properties, geometry });

describe("lerDataDeteccao", () => {
  it.each([
    ["2023-05-10", "2023-05-10"],
    ["2023-05-10T13:45:00Z", "2023-05-10"],
    ["2023/05/10", "2023-05-10"],
    ["20230510", "2023-05-10"],
    [20230510, "2023-05-10"],
    ["10/05/2023", "2023-05-10"],
    [" 2021-01-01 ", "2021-01-01"],
  ])("%s → %s", (entrada, esperado) => {
    expect(lerDataDeteccao(entrada)?.toISOString().slice(0, 10)).toBe(esperado);
  });

  it.each([["2023-02-30"], ["abc"], [2023], [null], [""], ["1900-01-01"], [12.5]])("recusa %s", (entrada) => {
    expect(lerDataDeteccao(entrada)).toBeNull();
  });
});

describe("prepararAlertas (RF19)", () => {
  const opcoes = { campoData: "DATADETEC", campoCodigo: "CODEALERTA" };

  it("normaliza alertas válidos, repara auto-interseção e descarta os inválidos com motivo", () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        feature(quadrado(-45.8, -12.1, -45.79, -12.09), { DATADETEC: "2023-05-10", CODEALERTA: 12345 }),
        feature({ type: "Point", coordinates: [-45.8, -12.1] }, { DATADETEC: "2023-05-10" }),
        feature(quadrado(-45.8, -12.1, -45.79, -12.09), { DATADETEC: "sem data" }),
        feature(
          { type: "Polygon", coordinates: [[[-45.8, -12.1], [-45.79, -12.09], [-45.79, -12.1], [-45.8, -12.09], [-45.8, -12.1]]] },
          { DATADETEC: "2023-05-10" },
        ),
        feature(quadrado(-45.7, -12.1, -45.69, -12.09), null),
      ],
    };
    const r = prepararAlertas(geojson, opcoes);
    if (typeof r === "string") throw new Error(r);
    expect(r.alertas).toHaveLength(2);
    expect(r.alertas[0]).toMatchObject({ codigoFonte: "12345", bbox: [-45.8, -12.1, -45.79, -12.09] });
    expect(r.alertas[0].dataDeteccao.toISOString()).toBe("2023-05-10T00:00:00.000Z");
    // A gravata-borboleta (auto-interseção) é reparada, não descartada: esconder um alerta seria pior.
    expect(r.reparados).toBe(1);
    // Vira dois triângulos que se tocam no cruzamento: metade da área do quadrado envolvente.
    const quadradoInteiro = area(quadrado(-45.8, -12.1, -45.79, -12.09) as GeoJSON.Polygon);
    expect(area(r.alertas[1].geometria) / quadradoInteiro).toBeCloseTo(0.5, 2);
    expect(r.descartados.map((d) => d.posicao)).toEqual([1, 2, 4]);
    expect(r.descartados[2].motivo).toContain('"DATADETEC"');
  });

  it("código vazio vira null e descarta altitude", () => {
    const comAltitude = { type: "Polygon", coordinates: [[[-45.8, -12.1, 500], [-45.79, -12.1, 500], [-45.79, -12.09, 500], [-45.8, -12.1, 500]]] };
    const r = prepararAlertas({ type: "FeatureCollection", features: [feature(comAltitude, { DATADETEC: "2022-01-01", CODEALERTA: "" })] }, opcoes);
    if (typeof r === "string") throw new Error(r);
    expect(r.alertas[0].codigoFonte).toBeNull();
    expect(r.alertas[0].geometria.coordinates[0][0]).toEqual([-45.8, -12.1]);
  });

  it("recusa arquivo que não é GeoJSON", () => {
    expect(prepararAlertas({ foo: 1 }, opcoes)).toContain("não é um GeoJSON");
  });
});

describe("repararGeometria", () => {
  it("anéis que só se tocam num vértice mantêm a área", () => {
    // Buraco encostando no contorno em (0,0): válido pela especificação, mas acusado pelo kinks.
    const poligono = {
      type: "Polygon" as const,
      coordinates: [
        [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]],
        [[0, 0], [0.004, 0.002], [0.002, 0.004], [0, 0]],
      ],
    };
    const reparada = repararGeometria(poligono);
    expect(reparada).not.toBeNull();
    expect(area(reparada!)).toBeCloseTo(area(poligono), -1);
  });
});

describe("prepararCobertura", () => {
  it("une municípios vizinhos em uma geometria", () => {
    const r = prepararCobertura({
      type: "FeatureCollection",
      features: [feature(quadrado(-46, -12.3, -45.6, -11.9)), feature(quadrado(-45.6, -12.3, -45.2, -11.9))],
    });
    if (typeof r === "string") throw new Error(r);
    expect(r.bbox).toEqual([-46, -12.3, -45.2, -11.9]);
    expect(r.geometria.type).toBe("Polygon");
  });

  it("aceita um único polígono", () => {
    const r = prepararCobertura(feature(quadrado(-46, -12.3, -45.6, -11.9)));
    expect(typeof r).not.toBe("string");
  });

  it("recusa cobertura sem polígonos ou com coordenadas inválidas", () => {
    expect(prepararCobertura({ type: "FeatureCollection", features: [] })).toContain("nenhum polígono");
    expect(prepararCobertura(quadrado(500000, 8660000, 501000, 8661000))).toContain("WGS 84");
  });
});
