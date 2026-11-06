import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { montarConteudo, type EntradaConteudo } from "./conteudo";
import { gerarPdf } from "./pdf";

const PIVO = {
  type: "Polygon" as const,
  coordinates: [
    Array.from({ length: 33 }, (_, i) => {
      const a = (2 * Math.PI * (i % 32)) / 32;
      return [-45.7231 + 0.0055 * Math.cos(a), -11.8882 + 0.0054 * Math.sin(a)];
    }),
  ],
};
const SOBREPOSTO = {
  type: "Polygon" as const,
  coordinates: [[[-45.7286, -11.8882], [-45.7266, -11.8852], [-45.7246, -11.8902], [-45.7286, -11.8882]]],
};

function entrada(risco: "BAIXO" | "ALTO", qtdAlertas: number): EntradaConteudo {
  return {
    codigo: "RV-2026-8F3K2Q",
    emitidoEm: new Date("2026-11-25T15:30:00Z"),
    baseUrl: "https://rastroverde.vercel.app",
    propriedade: { nome: "Fazenda Chapadão", municipio: "Luís Eduardo Magalhães", uf: "BA", cultura: "Soja", car: "BA-2919553-ABCD" },
    talhao: { nome: "Pivô 1", areaHa: 112.66, geometria: PIVO },
    analise: {
      criadaEm: new Date("2026-11-25T15:00:00Z"),
      risco,
      areaSobrepostaHa: risco === "ALTO" ? 16.47 : 0,
      percentual: risco === "ALTO" ? 14.62 : 0,
      sobreposicao: {
        type: "FeatureCollection",
        features: Array.from({ length: qtdAlertas }, (_, i) => ({
          type: "Feature" as const,
          geometry: SOBREPOSTO,
          properties: { codigo: `42343fb3-9324-478c-be0a-ea8a8969158${i}`, dataDeteccao: "2022-07-31", areaHa: 16.43 / (i + 1) },
        })),
      },
    },
    base: { fonte: "PRODES Cerrado (INPE)", versao: "2026-10-16" },
    resumo: { texto: "Resumo de teste em linguagem simples, com acentuação: área, cultura, município.", porIA: false },
  };
}

describe("gerarPdf (US10)", () => {
  it.each([
    ["risco alto com alertas", entrada("ALTO", 2)],
    ["risco baixo sem alertas", entrada("BAIXO", 0)],
    ["muitos alertas (tabela limitada)", entrada("ALTO", 20)],
  ])("%s", async (nome, e) => {
    const bytes = await gerarPdf(montarConteudo(e));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(3_000);
    expect(bytes.length).toBeLessThan(500_000);
    // Para conferir o visual: SALVAR_PDF=<pasta> npx vitest run src/lib/dossie/pdf.test.tsx
    if (process.env.SALVAR_PDF) writeFileSync(`${process.env.SALVAR_PDF}/${nome.replace(/\W+/g, "-")}.pdf`, bytes);
  }, 30_000);
});
