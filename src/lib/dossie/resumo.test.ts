import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PALAVRAS_RESUMO, ajustarTextoIA, gerarResumo, montarPrompt, textoPadrao, type DadosResumo } from "./resumo";

const ALTO: DadosResumo = {
  risco: "ALTO",
  areaTalhaoHa: 112.66,
  areaSobrepostaHa: 16.47,
  percentual: 14.62,
  alertas: [
    { dataDeteccao: "2022-07-31", areaHa: 16.43 },
    { dataDeteccao: "2021-07-28", areaHa: 0.05 },
  ],
  fonte: "PRODES Cerrado (INPE)",
  versao: "2026-10-16",
  cultura: "Soja",
  municipio: "Luís Eduardo Magalhães",
  uf: "BA",
};
const BAIXO: DadosResumo = { ...ALTO, risco: "BAIXO", areaSobrepostaHa: 0, percentual: 0, alertas: [] };
const ATENCAO: DadosResumo = { ...ALTO, risco: "ATENCAO", areaSobrepostaHa: 0.3, percentual: 0.27, alertas: [{ dataDeteccao: "2023-05-10", areaHa: 0.3 }] };

const palavras = (t: string) => t.split(/\s+/).filter(Boolean).length;

function respostaGemini(texto: string, status = 200) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] }), { status });
}

afterEach(() => vi.restoreAllMocks());

describe("textoPadrao", () => {
  it.each([
    ["BAIXO", BAIXO, "não encontrou"],
    ["ATENCAO", ATENCAO, "risco é de atenção"],
    ["ALTO", ALTO, "risco é alto"],
  ] as const)("%s: cita corte, base e fica dentro do limite", (_, dados, trecho) => {
    const t = textoPadrao(dados);
    expect(t).toContain(trecho);
    expect(t).toContain("31/12/2020");
    expect(t).toContain("PRODES Cerrado (INPE)");
    expect(palavras(t)).toBeLessThanOrEqual(MAX_PALAVRAS_RESUMO);
  });

  it("ALTO lista os anos dos alertas e a área", () => {
    const t = textoPadrao(ALTO);
    expect(t).toContain("2 alertas");
    expect(t).toContain("2021 e 2022");
    expect(t).toContain("16,47 ha");
    expect(t).toContain("14,62%");
  });
});

describe("montarPrompt", () => {
  it("só leva dados não pessoais da análise (RNF06)", () => {
    const { sistema, usuario } = montarPrompt(ALTO);
    expect(sistema).toContain(`nunca mais de ${MAX_PALAVRAS_RESUMO}`);
    expect(sistema).toContain("não diga que o produto atende ao EUDR");
    expect(usuario).toContain("Sem uma justificativa documentada");
    expect(usuario).toContain("31/07/2022");
    expect(usuario).toContain("Risco calculado: alto");
    expect(usuario).not.toMatch(/@|nome do produtor|propriedade:/i);
  });
});

describe("ajustarTextoIA", () => {
  it("tira markdown e quebras", () => {
    expect(ajustarTextoIA("**Risco alto.**\n\nTexto  final.")).toBe("Risco alto. Texto final.");
  });

  it("vazio → null", () => {
    expect(ajustarTextoIA("  \n ")).toBeNull();
  });

  it("corta na última frase completa dentro do limite", () => {
    const frase = "Uma frase com exatamente oito palavras aqui dentro.";
    const longo = Array(20).fill(frase).join(" ");
    const t = ajustarTextoIA(longo)!;
    expect(palavras(t)).toBeLessThanOrEqual(MAX_PALAVRAS_RESUMO);
    expect(t.endsWith(".")).toBe(true);
  });

  it("texto longo sem ponto → null", () => {
    expect(ajustarTextoIA(Array(200).fill("palavra").join(" "))).toBeNull();
  });
});

describe("gerarResumo (RNF10)", () => {
  it("sem chave → texto padrão, sem chamar a rede", async () => {
    const f = vi.fn();
    const r = await gerarResumo(ALTO, { fetch: f });
    expect(r).toEqual({ texto: textoPadrao(ALTO), porIA: false });
    expect(f).not.toHaveBeenCalled();
  });

  it("com chave → texto da IA, chave no cabeçalho e não na URL", async () => {
    const f = vi.fn().mockResolvedValue(respostaGemini("O talhão tem risco alto porque houve desmatamento após 31/12/2020."));
    const r = await gerarResumo(ALTO, { chave: "chave-teste", modelo: "modelo-x", fetch: f });
    expect(r.porIA).toBe(true);
    expect(r.texto).toContain("risco alto");
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/models/modelo-x:generateContent");
    expect(url).not.toContain("chave-teste");
    expect(init.headers["x-goog-api-key"]).toBe("chave-teste");
  });

  it.each([
    ["HTTP 429", () => Promise.resolve(respostaGemini("x", 429))],
    ["erro de rede", () => Promise.reject(new TypeError("fetch failed"))],
    ["resposta vazia", () => Promise.resolve(new Response("{}"))],
  ])("%s → texto padrão", async (_, impl) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await gerarResumo(BAIXO, { chave: "k", fetch: vi.fn().mockImplementation(impl) });
    expect(r).toEqual({ texto: textoPadrao(BAIXO), porIA: false });
  });

  it("tempo esgotado → texto padrão", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const lento: typeof fetch = (_url, init) =>
      new Promise((_, rejeitar) => init?.signal?.addEventListener("abort", () => rejeitar(init.signal!.reason)));
    const r = await gerarResumo(ATENCAO, { chave: "k", fetch: lento, timeoutMs: 50 });
    expect(r.porIA).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("tempo esgotado"));
  });
});
