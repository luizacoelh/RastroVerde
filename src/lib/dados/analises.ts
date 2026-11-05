// Análises de talhões (US07/US08). Todas as consultas filtram pelo dono (RF20/RNF04).
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { obterTalhao } from "@/lib/dados/propriedades";
import { DATA_CORTE_EUDR, analisarSobreposicao, talhaoCoberto, type Risco, type Sobreposicao } from "@/lib/geo/analise";
import type { GeometriaTalhao } from "@/lib/geo/talhao";

export type ResultadoExecucao = { ok: true; analiseId: string } | { ok: false; motivo: "sem-dados" };

type Retangulo = { bboxMinLng: number; bboxMinLat: number; bboxMaxLng: number; bboxMaxLat: number };

/** Filtro de retângulos que se cruzam (pré-filtro barato antes do Turf, ADR-01). */
function cruzaRetangulo(r: Retangulo) {
  return {
    bboxMinLng: { lte: r.bboxMaxLng },
    bboxMaxLng: { gte: r.bboxMinLng },
    bboxMinLat: { lte: r.bboxMaxLat },
    bboxMaxLat: { gte: r.bboxMinLat },
  };
}

/**
 * UC4: escolhe a base mais recente que cobre o talhão, cruza com os alertas posteriores
 * a 31/12/2020 e grava a análise com a versão da base (RF11, RNF11).
 */
export async function executarAnalise(
  usuarioId: string,
  propriedadeId: string,
  talhaoId: string,
): Promise<ResultadoExecucao> {
  const talhao = await obterTalhao(usuarioId, propriedadeId, talhaoId);

  const bases = await db.baseAlertas.findMany({
    where: cruzaRetangulo(talhao),
    orderBy: { importadaEm: "desc" },
    select: { id: true, cobertura: true },
  });
  const base = bases.find((b) => talhaoCoberto(talhao.geometria, b.cobertura as unknown as GeometriaTalhao));
  if (!base) return { ok: false, motivo: "sem-dados" };

  const alertas = await db.alerta.findMany({
    where: { baseId: base.id, dataDeteccao: { gt: DATA_CORTE_EUDR }, ...cruzaRetangulo(talhao) },
    select: { codigoFonte: true, dataDeteccao: true, geometria: true },
  });

  const resultado = analisarSobreposicao(
    talhao.geometria,
    alertas.map((a) => ({
      codigo: a.codigoFonte,
      dataDeteccao: a.dataDeteccao,
      geometria: a.geometria as unknown as GeometriaTalhao,
    })),
  );

  const analise = await db.analise.create({
    data: {
      talhaoId: talhao.id,
      baseId: base.id,
      areaSobrepostaHa: resultado.areaSobrepostaHa,
      percentual: resultado.percentual,
      risco: resultado.risco,
      sobreposicao: resultado.sobreposicao as unknown as Prisma.InputJsonObject,
    },
    select: { id: true },
  });
  return { ok: true, analiseId: analise.id };
}

/** Última análise válida (não obsoleta pela RN03) do talhão, ou null. */
export async function obterUltimaAnalise(usuarioId: string, talhaoId: string) {
  const analise = await db.analise.findFirst({
    where: { talhaoId, obsoleta: false, talhao: { propriedade: { usuarioId } } },
    orderBy: { criadaEm: "desc" },
    include: { base: { select: { fonte: true, versao: true } } },
  });
  if (!analise) return null;
  return { ...analise, sobreposicao: analise.sobreposicao as unknown as Sobreposicao };
}

/** RN03: o talhão já teve análise, mas o polígono mudou depois dela. */
export async function temAnaliseObsoleta(usuarioId: string, talhaoId: string) {
  const qtd = await db.analise.count({
    where: { talhaoId, obsoleta: true, talhao: { propriedade: { usuarioId } } },
  });
  return qtd > 0;
}

/** Risco da última análise válida de cada talhão da propriedade. */
export async function riscosDosTalhoes(usuarioId: string, propriedadeId: string): Promise<Map<string, Risco>> {
  const analises = await db.analise.findMany({
    where: { obsoleta: false, talhao: { propriedadeId, propriedade: { usuarioId } } },
    orderBy: { criadaEm: "desc" },
    select: { talhaoId: true, risco: true },
  });
  const riscos = new Map<string, Risco>();
  for (const a of analises) if (!riscos.has(a.talhaoId)) riscos.set(a.talhaoId, a.risco);
  return riscos;
}
