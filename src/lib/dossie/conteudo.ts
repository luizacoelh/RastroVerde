// Conteúdo do dossiê (US10, RF15, RF17): código público, hash e a cópia dos dados na emissão.
import { createHash, randomInt } from "node:crypto";
import type { Position } from "geojson";
import type { PropriedadesSobreposicao, Sobreposicao } from "@/lib/geo/analise";
import { calcularCentroide, type GeometriaTalhao } from "@/lib/geo/talhao";
import type { Risco } from "@/lib/risco";

/** Alfabeto de Crockford (sem I, L, O, U): fácil de ler e digitar. */
const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TAMANHO_SUFIXO = 6;

/** RV-2026-8F3K2Q */
export const FORMATO_CODIGO = /^RV-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/;

/** Código público do dossiê: prefixo, ano da emissão e 6 caracteres aleatórios (~1 bilhão de combinações). */
export function gerarCodigo(emitidoEm: Date, sortear: (max: number) => number = randomInt): string {
  let sufixo = "";
  for (let i = 0; i < TAMANHO_SUFIXO; i++) sufixo += ALFABETO[sortear(ALFABETO.length)];
  return `RV-${emitidoEm.getUTCFullYear()}-${sufixo}`;
}

/** Normaliza o que o comprador digitar (minúsculas, espaços) antes de procurar o código. */
export function normalizarCodigo(entrada: string): string | null {
  const codigo = decodeURIComponent(entrada).trim().toUpperCase();
  return FORMATO_CODIGO.test(codigo) ? codigo : null;
}

/** SHA-256 em hexadecimal dos bytes do PDF (RF17). */
export function calcularHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Endereço da página pública de verificação, gravado no QR code (US12). */
export function urlVerificacao(baseUrl: string, codigo: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/verificar/${codigo}`;
}

/** Tudo o que o PDF mostra, congelado na emissão (RN04). Sem nome nem e-mail do produtor (RNF06). */
export type ConteudoDossie = {
  codigo: string;
  emitidoEm: string;
  urlVerificacao: string;
  propriedade: { nome: string; municipio: string; uf: string; cultura: string; car: string | null };
  talhao: { nome: string; areaHa: number; centroide: Position; geometria: GeometriaTalhao };
  analise: {
    criadaEm: string;
    risco: Risco;
    areaSobrepostaHa: number;
    percentual: number;
    alertas: PropriedadesSobreposicao[];
    sobreposicao: Sobreposicao;
  };
  base: { fonte: string; versao: string };
  resumo: { texto: string; porIA: boolean };
};

export type EntradaConteudo = {
  codigo: string;
  emitidoEm: Date;
  baseUrl: string;
  propriedade: ConteudoDossie["propriedade"];
  talhao: { nome: string; areaHa: number; geometria: GeometriaTalhao };
  analise: { criadaEm: Date; risco: Risco; areaSobrepostaHa: number; percentual: number; sobreposicao: Sobreposicao };
  base: ConteudoDossie["base"];
  resumo: ConteudoDossie["resumo"];
};

const arredondar = (v: number, casas: number) => Number(v.toFixed(casas));

export function montarConteudo(e: EntradaConteudo): ConteudoDossie {
  const [lng, lat] = calcularCentroide(e.talhao.geometria);
  return {
    codigo: e.codigo,
    emitidoEm: e.emitidoEm.toISOString(),
    urlVerificacao: urlVerificacao(e.baseUrl, e.codigo),
    propriedade: e.propriedade,
    talhao: {
      nome: e.talhao.nome,
      areaHa: e.talhao.areaHa,
      centroide: [arredondar(lng, 6), arredondar(lat, 6)],
      geometria: e.talhao.geometria,
    },
    analise: {
      criadaEm: e.analise.criadaEm.toISOString(),
      risco: e.analise.risco,
      areaSobrepostaHa: e.analise.areaSobrepostaHa,
      percentual: e.analise.percentual,
      alertas: e.analise.sobreposicao.features.map((f) => f.properties),
      sobreposicao: e.analise.sobreposicao,
    },
    base: e.base,
    resumo: e.resumo,
  };
}

/** Coordenada em graus decimais com hemisfério: 12,48280° S, 46,20048° O. */
export function formatarCoordenada([lng, lat]: Position): string {
  const f = (v: number) => Math.abs(v).toFixed(5).replace(".", ",");
  return `${f(lat)}° ${lat < 0 ? "S" : "N"}, ${f(lng)}° ${lng < 0 ? "O" : "L"}`;
}
