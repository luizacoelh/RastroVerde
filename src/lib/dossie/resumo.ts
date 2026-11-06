// Resumo do dossiê em linguagem simples (US11, RF16). A IA (Gemini) é opcional: sem chave, com
// erro, demora ou resposta fora do formato, usa-se o texto padrão (RNF10, ADR-04).
// Só dados não pessoais vão para a IA: risco, áreas, datas, base, cultura e município (RNF06).
import { formatarPercentual } from "@/lib/geo/analise";
import { formatarHa } from "@/lib/geo/talhao";
import { formatarDataIso } from "@/lib/formato";
import type { Risco } from "@/lib/risco";

export const MAX_PALAVRAS_RESUMO = 120;
export const TIMEOUT_IA_MS = 8_000;
// Modelo fixo (não um apelido "latest"): resposta em menos de 1 s e versão previsível. Em 06/11/2026 os
// modelos "flash" maiores davam 503 (alta demanda) ou passavam de 8 s; um resumo curto não precisa deles.
export const MODELO_PADRAO = "gemini-3.5-flash-lite";

export type DadosResumo = {
  risco: Risco;
  areaTalhaoHa: number;
  areaSobrepostaHa: number;
  percentual: number;
  alertas: { dataDeteccao: string; areaHa: number }[];
  fonte: string;
  versao: string;
  cultura: string;
  municipio: string;
  uf: string;
};

export type Resumo = { texto: string; porIA: boolean };

function anos(alertas: DadosResumo["alertas"]): string {
  const lista = [...new Set(alertas.map((a) => a.dataDeteccao.slice(0, 4)))].sort();
  if (lista.length <= 1) return lista[0] ?? "";
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

/** Texto padrão, montado só com os números da análise (RF16: usado quando a IA falha). */
export function textoPadrao(d: DadosResumo): string {
  const base = `${d.fonte} (versão ${d.versao})`;
  const talhao = `o talhão de ${formatarHa(d.areaTalhaoHa)} de ${d.cultura.toLowerCase()} em ${d.municipio}/${d.uf}`;
  if (d.risco === "BAIXO") {
    return (
      `A análise cruzou ${talhao} com os alertas de desmatamento da base ${base} e não encontrou ` +
      `desmatamento detectado depois de 31/12/2020, a data de corte do regulamento europeu (EUDR). ` +
      `Por isso o risco é baixo. O resultado vale para o polígono informado e para a base usada; ` +
      `áreas fora do talhão não foram avaliadas.`
    );
  }
  const qtd = d.alertas.length === 1 ? "1 alerta" : `${d.alertas.length} alertas`;
  const sobreposicao =
    `A análise cruzou ${talhao} com a base ${base} e encontrou ${qtd} de desmatamento detectado ` +
    `depois de 31/12/2020 (${anos(d.alertas)}), a data de corte do regulamento europeu (EUDR), ` +
    `somando ${formatarHa(d.areaSobrepostaHa)} dentro do talhão (${formatarPercentual(d.percentual)} da área).`;
  if (d.risco === "ATENCAO") {
    return (
      `${sobreposicao} A sobreposição é pequena, por isso o risco é de atenção: confira no mapa se o ` +
      `alerta está mesmo dentro da área plantada ou se é só a borda do polígono antes de exportar.`
    );
  }
  return (
    `${sobreposicao} Por isso o risco é alto: sem uma justificativa documentada, o produto desta ` +
    `área não atende ao EUDR.`
  );
}

/** Sentido aprovado de cada risco, para a IA não exagerar (ex.: "não pode vender", "atende ao EUDR"). */
const SIGNIFICADO_RISCO: Record<Risco, string> = {
  BAIXO:
    "não foi encontrado desmatamento detectado após 31/12/2020 dentro do talhão. Isso cobre só o critério de " +
    "desmatamento do EUDR; outros requisitos, como a legalidade da produção, não são avaliados aqui.",
  ATENCAO:
    "há uma sobreposição pequena com desmatamento detectado após 31/12/2020. Antes de exportar, é preciso " +
    "conferir no mapa se o alerta está mesmo dentro da área plantada ou se é só a borda do polígono.",
  ALTO:
    "há sobreposição com desmatamento detectado após 31/12/2020 acima dos limites de atenção. Sem uma " +
    "justificativa documentada, o produto desta área não cumpre o critério de desmatamento do EUDR.",
};

/** Instrução e dados enviados ao Gemini. */
export function montarPrompt(d: DadosResumo): { sistema: string; usuario: string } {
  const sistema =
    "Você escreve o resumo de um dossiê de conformidade com o regulamento europeu de produtos livres " +
    "de desmatamento (EUDR) para um produtor rural brasileiro e para o comprador. Escreva em português " +
    "do Brasil, em linguagem simples, em um único parágrafo de 60 a 90 palavras (nunca mais de " +
    `${MAX_PALAVRAS_RESUMO}), sem títulos, listas, markdown ou emojis. Comece pelo resultado: o risco e o ` +
    "significado dele, usando o sentido dado nos dados, sem exagerar. Se houver sobreposição, diga a área " +
    "sobreposta em hectares e em porcentagem do talhão e os anos em que os alertas foram detectados. " +
    "Mencione a data de corte de 31/12/2020 e a base de alertas usada. Escreva números e datas com " +
    "algarismos (ex.: 31/12/2020, 16,47 ha). Não repita a regra de classificação nem descreva o talhão em " +
    "detalhes. Use somente os dados fornecidos; não invente números, datas, termos, causas nem " +
    "recomendações jurídicas. A análise cobre só o critério de desmatamento do EUDR: não diga que o " +
    "produto atende ao EUDR, que pode ou não pode ser vendido, nem que está certificado, aprovado ou isento.";
  const alertas = d.alertas.length
    ? d.alertas.map((a) => `- detectado em ${formatarDataIso(a.dataDeteccao)}, ${formatarHa(a.areaHa)} dentro do talhão`).join("\n")
    : "- nenhum";
  const usuario = [
    `Cultura: ${d.cultura}`,
    `Município: ${d.municipio}/${d.uf}`,
    `Área do talhão: ${formatarHa(d.areaTalhaoHa)}`,
    `Base de alertas: ${d.fonte}, versão ${d.versao}`,
    `Área sobreposta a desmatamento após 31/12/2020: ${formatarHa(d.areaSobrepostaHa)} (${formatarPercentual(d.percentual)} do talhão)`,
    `Alertas após 31/12/2020 dentro do talhão:\n${alertas}`,
    `Risco calculado: ${{ BAIXO: "baixo", ATENCAO: "atenção", ALTO: "alto" }[d.risco]}`,
    `O que o risco significa: ${SIGNIFICADO_RISCO[d.risco]}`,
    "Regra do risco: baixo = sem sobreposição; atenção = menos de 1% da área e menos de 0,5 ha; alto = demais casos.",
  ].join("\n");
  return { sistema, usuario };
}

/**
 * Limpa a resposta da IA: tira markdown e quebras, e garante no máximo 120 palavras cortando na
 * última frase completa. Devolve null se não sobrar texto aproveitável.
 */
export function ajustarTextoIA(bruto: string, maxPalavras = MAX_PALAVRAS_RESUMO): string | null {
  const texto = bruto
    .replace(/[*_#`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!texto) return null;
  const palavras = texto.split(" ");
  if (palavras.length <= maxPalavras) return texto;
  const corte = palavras.slice(0, maxPalavras).join(" ");
  const fim = Math.max(corte.lastIndexOf(". "), corte.endsWith(".") ? corte.length - 1 : -1);
  if (fim < corte.length / 2) return null; // sobraria pouco texto: melhor o padrão
  return corte.slice(0, fim + 1);
}

type RespostaGemini = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

export type OpcoesResumo = {
  chave?: string;
  modelo?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

/** Pede o resumo ao Gemini; qualquer falha cai no texto padrão (RNF10). */
export async function gerarResumo(d: DadosResumo, opcoes: OpcoesResumo = {}): Promise<Resumo> {
  const padrao: Resumo = { texto: textoPadrao(d), porIA: false };
  if (!opcoes.chave) return padrao;

  const { sistema, usuario } = montarPrompt(d);
  const modelo = opcoes.modelo || MODELO_PADRAO;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
  try {
    const resposta = await (opcoes.fetch ?? fetch)(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opcoes.chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: [{ text: usuario }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(opcoes.timeoutMs ?? TIMEOUT_IA_MS),
    });
    if (!resposta.ok) {
      console.warn(`Resumo por IA indisponível (HTTP ${resposta.status}); usando o texto padrão.`);
      return padrao;
    }
    const json = (await resposta.json()) as RespostaGemini;
    const bruto = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const texto = ajustarTextoIA(bruto);
    if (!texto) {
      console.warn("Resumo por IA vazio ou fora do formato; usando o texto padrão.");
      return padrao;
    }
    return { texto, porIA: true };
  } catch (e) {
    const motivo = e instanceof Error && e.name === "TimeoutError" ? "tempo esgotado" : "erro de rede";
    console.warn(`Resumo por IA indisponível (${motivo}); usando o texto padrão.`);
    return padrao;
  }
}
