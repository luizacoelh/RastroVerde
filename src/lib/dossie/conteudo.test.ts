import { describe, expect, it } from "vitest";
import {
  FORMATO_CODIGO,
  calcularHash,
  formatarCoordenada,
  gerarCodigo,
  montarConteudo,
  normalizarCodigo,
  urlVerificacao,
} from "./conteudo";

describe("código do dossiê", () => {
  it("formato RV-AAAA-XXXXXX sem letras ambíguas", () => {
    for (let i = 0; i < 200; i++) {
      const c = gerarCodigo(new Date("2026-11-25T12:00:00Z"));
      expect(c).toMatch(FORMATO_CODIGO);
      expect(c).toMatch(/^RV-2026-/);
      expect(c.slice(8)).not.toMatch(/[ILOU]/);
    }
  });

  it("sorteio determinístico", () => {
    expect(gerarCodigo(new Date("2026-01-01T00:00:00Z"), () => 0)).toBe("RV-2026-000000");
    expect(gerarCodigo(new Date("2026-01-01T00:00:00Z"), () => 31)).toBe("RV-2026-ZZZZZZ");
  });

  it("normaliza o que o comprador digitar", () => {
    expect(normalizarCodigo(" rv-2026-8f3k2q ")).toBe("RV-2026-8F3K2Q");
    expect(normalizarCodigo("RV-2026-8F3K2")).toBeNull();
    expect(normalizarCodigo("RV-2026-8F3K2I")).toBeNull();
    expect(normalizarCodigo("../../etc")).toBeNull();
  });
});

describe("hash e URL", () => {
  it("SHA-256 em hexadecimal", () => {
    expect(calcularHash(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("URL de verificação sem barra dupla", () => {
    expect(urlVerificacao("https://rastroverde.vercel.app/", "RV-2026-000000")).toBe(
      "https://rastroverde.vercel.app/verificar/RV-2026-000000",
    );
  });

  it("coordenada com hemisfério", () => {
    expect(formatarCoordenada([-46.2004796, -12.4828])).toBe("12,48280° S, 46,20048° O");
  });
});

describe("montarConteudo", () => {
  it("congela os dados da emissão, com centroide e alertas", () => {
    const geometria = {
      type: "Polygon" as const,
      coordinates: [[[-45.8, -12.1], [-45.79, -12.1], [-45.79, -12.09], [-45.8, -12.09], [-45.8, -12.1]]],
    };
    const c = montarConteudo({
      codigo: "RV-2026-000000",
      emitidoEm: new Date("2026-11-25T15:00:00Z"),
      baseUrl: "http://localhost:3000",
      propriedade: { nome: "Fazenda", municipio: "LEM", uf: "BA", cultura: "Soja", car: null },
      talhao: { nome: "T1", areaHa: 120.4, geometria },
      analise: {
        criadaEm: new Date("2026-11-25T14:00:00Z"),
        risco: "ATENCAO",
        areaSobrepostaHa: 0.3,
        percentual: 0.25,
        sobreposicao: {
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: geometria, properties: { codigo: "A1", dataDeteccao: "2023-05-10", areaHa: 0.3 } }],
        },
      },
      base: { fonte: "PRODES", versao: "1" },
      resumo: { texto: "Resumo.", porIA: false },
    });
    expect(c.urlVerificacao).toBe("http://localhost:3000/verificar/RV-2026-000000");
    expect(c.talhao.centroide).toEqual([-45.795, -12.095]);
    expect(c.analise.alertas).toEqual([{ codigo: "A1", dataDeteccao: "2023-05-10", areaHa: 0.3 }]);
    expect(c.emitidoEm).toBe("2026-11-25T15:00:00.000Z");
    expect(JSON.stringify(c)).not.toMatch(/@/); // sem e-mail (RNF06)
  });
});
