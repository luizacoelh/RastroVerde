import { describe, expect, it } from "vitest";
import type { MultiPolygon, Polygon } from "geojson";
import {
  analisarSobreposicao,
  classificarRisco,
  formatarPercentual,
  talhaoCoberto,
  type AlertaParaAnalise,
} from "./analise";

function quadrado(lng0: number, lat0: number, lng1: number, lat1: number): Polygon {
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

function alerta(data: string, geometria: Polygon | MultiPolygon, codigo: string | null = "A1"): AlertaParaAnalise {
  return { codigo, dataDeteccao: new Date(`${data}T00:00:00Z`), geometria };
}

// Talhão de ~120 ha em Luís Eduardo Magalhães (BA).
const TALHAO = quadrado(-45.8, -12.1, -45.79, -12.09);
// Alerta que pega só o canto do talhão: 0,0005° × 0,0005° ≈ 0,3 ha (0,25%).
const CANTO = quadrado(-45.7905, -12.0905, -45.789, -12.089);
const METADE = quadrado(-45.8, -12.1, -45.795, -12.09);

describe("classificarRisco (RF10)", () => {
  it.each([
    [0, 0, "BAIXO"],
    [0.00005, 0.00004, "BAIXO"], // < 1 m²: ruído numérico
    [0.3, 0.25, "ATENCAO"],
    [0.49, 0.99, "ATENCAO"],
    [0.5, 0.4, "ALTO"], // atingiu 0,5 ha
    [0.3, 1, "ALTO"], // atingiu 1%
    [0.3, 2.5, "ALTO"], // talhão pequeno: menos de 0,5 ha, mas mais de 1%
    [12, 10, "ALTO"],
  ] as const)("%s ha e %s%% → %s", (ha, pct, esperado) => {
    expect(classificarRisco(ha, pct)).toBe(esperado);
  });
});

describe("analisarSobreposicao (RF09)", () => {
  it("sem alertas → Baixo", () => {
    const r = analisarSobreposicao(TALHAO, []);
    expect(r).toMatchObject({ areaSobrepostaHa: 0, percentual: 0, risco: "BAIXO" });
    expect(r.sobreposicao.features).toEqual([]);
    expect(r.areaTalhaoHa).toBeCloseTo(120.4, 0);
  });

  it("alerta no canto, depois do corte → Atenção com a área da interseção", () => {
    const r = analisarSobreposicao(TALHAO, [alerta("2023-05-10", CANTO, "MB-123")]);
    expect(r.risco).toBe("ATENCAO");
    expect(r.areaSobrepostaHa).toBeCloseTo(0.3, 1);
    expect(r.percentual).toBeCloseTo(0.25, 1);
    expect(r.sobreposicao.features).toHaveLength(1);
    expect(r.sobreposicao.features[0].properties).toMatchObject({ codigo: "MB-123", dataDeteccao: "2023-05-10" });
  });

  it("RN01: ignora alertas até 31/12/2020 e conta a partir de 01/01/2021", () => {
    expect(analisarSobreposicao(TALHAO, [alerta("2019-08-01", METADE)]).risco).toBe("BAIXO");
    expect(analisarSobreposicao(TALHAO, [alerta("2020-12-31", METADE)]).risco).toBe("BAIXO");
    const r = analisarSobreposicao(TALHAO, [alerta("2021-01-01", METADE)]);
    expect(r.risco).toBe("ALTO");
    expect(r.percentual).toBeCloseTo(50, 0);
  });

  it("alertas sobrepostos entre si não contam a área duas vezes", () => {
    const r = analisarSobreposicao(TALHAO, [alerta("2022-01-01", METADE, "A"), alerta("2023-01-01", METADE, "B")]);
    expect(r.sobreposicao.features).toHaveLength(2);
    expect(r.percentual).toBeCloseTo(50, 0);
  });

  it("alerta fora do talhão ou só encostando na borda → Baixo", () => {
    const longe = quadrado(-45.5, -12.5, -45.49, -12.49);
    const encostado = quadrado(-45.79, -12.1, -45.78, -12.09);
    const r = analisarSobreposicao(TALHAO, [alerta("2023-01-01", longe), alerta("2023-01-01", encostado)]);
    expect(r.risco).toBe("BAIXO");
    expect(r.sobreposicao.features).toEqual([]);
  });

  it("aceita talhão MultiPolygon e alerta MultiPolygon", () => {
    const multi: MultiPolygon = { type: "MultiPolygon", coordinates: [TALHAO.coordinates, quadrado(-45.7, -12.1, -45.69, -12.09).coordinates] };
    const r = analisarSobreposicao(multi, [alerta("2024-03-01", { type: "MultiPolygon", coordinates: [METADE.coordinates] })]);
    expect(r.percentual).toBeCloseTo(25, 0);
    expect(r.risco).toBe("ALTO");
  });

  it("ordena as sobreposições da maior para a menor", () => {
    const r = analisarSobreposicao(TALHAO, [alerta("2023-01-01", CANTO, "pequeno"), alerta("2023-01-01", METADE, "grande")]);
    expect(r.sobreposicao.features.map((f) => f.properties.codigo)).toEqual(["grande", "pequeno"]);
  });
});

describe("talhaoCoberto (UC4)", () => {
  const municipio = quadrado(-46, -12.3, -45.6, -11.9);

  it("talhão dentro da cobertura", () => {
    expect(talhaoCoberto(TALHAO, municipio)).toBe(true);
  });

  it("talhão fora ou parcialmente fora → região sem dados", () => {
    expect(talhaoCoberto(quadrado(-44, -12.1, -43.99, -12.09), municipio)).toBe(false);
    expect(talhaoCoberto(quadrado(-45.605, -12.1, -45.595, -12.09), municipio)).toBe(false);
  });

  it("cobertura com dois municípios vizinhos", () => {
    const vizinho = quadrado(-45.6, -12.3, -45.2, -11.9);
    const cobertura: MultiPolygon = { type: "MultiPolygon", coordinates: [municipio.coordinates, vizinho.coordinates] };
    expect(talhaoCoberto(quadrado(-45.605, -12.1, -45.595, -12.09), cobertura)).toBe(true);
  });
});

describe("formatarPercentual", () => {
  it.each([
    [0, "0%"],
    [0.004, "< 0,01%"],
    [0.25, "0,25%"],
    [50, "50%"],
  ])("%s → %s", (v, esperado) => {
    expect(formatarPercentual(v)).toBe(esperado);
  });
});
