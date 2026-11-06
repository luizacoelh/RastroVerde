// Dossiês (US10, US12). Consultas do produtor filtram pelo dono (RF20/RNF04).
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { obterUltimaAnalise } from "@/lib/dados/analises";
import { obterPropriedade, obterTalhao } from "@/lib/dados/propriedades";
import { calcularHash, gerarCodigo, montarConteudo, type ConteudoDossie } from "@/lib/dossie/conteudo";
import { gerarPdf } from "@/lib/dossie/pdf";
import { gerarResumo } from "@/lib/dossie/resumo";

/** RN04: mensagens exibidas quando a exclusão é bloqueada por dossiê emitido. */
export const MOTIVO_BLOQUEIO_TALHAO =
  "Este talhão tem dossiê emitido e não pode ser excluído: o dossiê precisa continuar verificável pelo comprador.";
export const MOTIVO_BLOQUEIO_PROPRIEDADE =
  "Esta propriedade tem talhão com dossiê emitido e não pode ser excluída: o dossiê precisa continuar verificável pelo comprador.";

/** Quantos dossiês foram emitidos para o talhão ou, sem talhaoId, para a propriedade inteira. */
export async function contarDossies(usuarioId: string, propriedadeId: string, talhaoId?: string) {
  return db.dossie.count({
    where: {
      analise: { talhao: { propriedadeId, propriedade: { usuarioId }, ...(talhaoId ? { id: talhaoId } : {}) } },
    },
  });
}

export type ResultadoEmissao = { ok: true; codigo: string } | { ok: false; erro: string };

const TENTATIVAS_CODIGO = 3;

function violouUnicidade(e: unknown, campo: string): boolean {
  if (typeof e !== "object" || e === null || (e as { code?: unknown }).code !== "P2002") return false;
  return JSON.stringify((e as { meta?: unknown }).meta ?? "").includes(campo);
}

/**
 * US10 — emite o dossiê da análise atual do talhão. RN02: só a partir de análise concluída;
 * RN03: análises obsoletas não geram dossiê. Cada análise gera no máximo um dossiê; pedir de
 * novo devolve o mesmo código. O resumo por IA nunca bloqueia a emissão (RNF10).
 */
export async function emitirDossie(
  usuarioId: string,
  propriedadeId: string,
  talhaoId: string,
  baseUrl: string,
): Promise<ResultadoEmissao> {
  const propriedade = await obterPropriedade(usuarioId, propriedadeId);
  const talhao = await obterTalhao(usuarioId, propriedade.id, talhaoId);
  const analise = await obterUltimaAnalise(usuarioId, talhao.id);
  if (!analise) {
    return { ok: false, erro: "Analise o talhão antes de gerar o dossiê. Se o polígono mudou, faça uma nova análise." };
  }
  const existente = await db.dossie.findUnique({ where: { analiseId: analise.id }, select: { codigo: true } });
  if (existente) return { ok: true, codigo: existente.codigo };

  const resumo = await gerarResumo(
    {
      risco: analise.risco,
      areaTalhaoHa: talhao.areaHa,
      areaSobrepostaHa: analise.areaSobrepostaHa,
      percentual: analise.percentual,
      alertas: analise.sobreposicao.features.map((f) => ({ dataDeteccao: f.properties.dataDeteccao, areaHa: f.properties.areaHa })),
      fonte: analise.base.fonte,
      versao: analise.base.versao,
      cultura: propriedade.cultura,
      municipio: propriedade.municipio,
      uf: propriedade.uf,
    },
    { chave: process.env.GEMINI_API_KEY, modelo: process.env.GEMINI_MODEL },
  );

  for (let tentativa = 1; tentativa <= TENTATIVAS_CODIGO; tentativa++) {
    const emitidoEm = new Date();
    const codigo = gerarCodigo(emitidoEm);
    const conteudo = montarConteudo({
      codigo,
      emitidoEm,
      baseUrl,
      propriedade: {
        nome: propriedade.nome,
        municipio: propriedade.municipio,
        uf: propriedade.uf,
        cultura: propriedade.cultura,
        car: propriedade.car,
      },
      talhao: { nome: talhao.nome, areaHa: talhao.areaHa, geometria: talhao.geometria },
      analise: {
        criadaEm: analise.criadaEm,
        risco: analise.risco,
        areaSobrepostaHa: analise.areaSobrepostaHa,
        percentual: analise.percentual,
        sobreposicao: analise.sobreposicao,
      },
      base: { fonte: analise.base.fonte, versao: analise.base.versao },
      resumo,
    });
    const pdf = await gerarPdf(conteudo);
    try {
      await db.dossie.create({
        data: {
          analiseId: analise.id,
          codigo,
          hash: calcularHash(pdf),
          resumo: resumo.texto,
          resumoPorIA: resumo.porIA,
          conteudo: conteudo as unknown as Prisma.InputJsonObject,
          pdf,
          emitidoEm,
        },
      });
      return { ok: true, codigo };
    } catch (e) {
      // Dois cliques ao mesmo tempo: o outro pedido já emitiu o dossiê desta análise.
      if (violouUnicidade(e, "analiseId")) {
        const outro = await db.dossie.findUniqueOrThrow({ where: { analiseId: analise.id }, select: { codigo: true } });
        return { ok: true, codigo: outro.codigo };
      }
      if (!violouUnicidade(e, "codigo") || tentativa === TENTATIVAS_CODIGO) throw e;
    }
  }
  throw new Error("inalcançável");
}

/** Dossiê da análise (para a tela de resultado), sem o PDF. */
export async function obterDossieDaAnalise(usuarioId: string, analiseId: string) {
  return db.dossie.findFirst({
    where: { analiseId, analise: { talhao: { propriedade: { usuarioId } } } },
    select: { codigo: true, hash: true, resumo: true, resumoPorIA: true, emitidoEm: true },
  });
}

/** PDF do dossiê, só para o dono (RF20). */
export async function obterPdfDoDossie(usuarioId: string, codigo: string) {
  return db.dossie.findFirst({
    where: { codigo, analise: { talhao: { propriedade: { usuarioId } } } },
    select: { codigo: true, pdf: true },
  });
}

/** US12 — dados públicos da verificação: nada de nome, e-mail ou nome da propriedade (RNF06). */
export async function obterVerificacao(codigo: string) {
  const dossie = await db.dossie.findUnique({
    where: { codigo },
    select: { codigo: true, hash: true, emitidoEm: true, conteudo: true },
  });
  if (!dossie) return null;
  const c = dossie.conteudo as unknown as ConteudoDossie;
  return {
    codigo: dossie.codigo,
    hash: dossie.hash,
    emitidoEm: dossie.emitidoEm,
    cultura: c.propriedade.cultura,
    municipio: c.propriedade.municipio,
    uf: c.propriedade.uf,
    areaTalhaoHa: c.talhao.areaHa,
    risco: c.analise.risco,
    areaSobrepostaHa: c.analise.areaSobrepostaHa,
    percentual: c.analise.percentual,
    analisadaEm: new Date(c.analise.criadaEm),
    fonte: c.base.fonte,
    versao: c.base.versao,
  };
}
