// Análises de talhões (US07/US08). Todas as consultas filtram pelo dono (RF20/RNF04).
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { obterPropriedade, obterTalhao } from "@/lib/dados/propriedades";
import { DATA_CORTE_EUDR, analisarSobreposicao, talhaoCoberto, type Risco, type Sobreposicao } from "@/lib/geo/analise";
import type { FeatureCollection } from "geojson";
import {
  conferirMunicipio,
  mensagemMunicipioDivergente,
  type ConferenciaMunicipio,
  type MunicipioDeclarado,
} from "@/lib/geo/municipio";
import type { GeometriaTalhao } from "@/lib/geo/talhao";
import { riscoMaisGrave } from "@/lib/risco";

export type ResultadoExecucao =
  | { ok: true; analiseId: string }
  | { ok: false; motivo: "sem-dados" }
  | { ok: false; motivo: "municipio"; mensagem: string };

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
 * Defeito 8: o talhão precisa estar no município declarado na propriedade, porque o dossiê mostra
 * esse município ao comprador. Usa só os limites cujo retângulo cruza o do talhão.
 */
export async function conferirMunicipioDoTalhao(
  talhao: Retangulo & { geometria: GeometriaTalhao },
  declarado: MunicipioDeclarado,
): Promise<ConferenciaMunicipio> {
  const limites = await db.municipio.findMany({
    where: cruzaRetangulo(talhao),
    select: { nome: true, uf: true, geometria: true },
  });
  return conferirMunicipio(
    talhao.geometria,
    declarado,
    limites.map((l) => ({ nome: l.nome, uf: l.uf, geometria: l.geometria as unknown as GeometriaTalhao })),
  );
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
  const propriedade = await obterPropriedade(usuarioId, propriedadeId);
  const talhao = await obterTalhao(usuarioId, propriedade.id, talhaoId);

  // Defeito 8: bloqueia antes de calcular, para não gravar análise de um município falso.
  const conferencia = await conferirMunicipioDoTalhao(talhao, propriedade);
  if (conferencia.situacao === "diverge") {
    return {
      ok: false,
      motivo: "municipio",
      mensagem: mensagemMunicipioDivergente(conferencia.encontrado, propriedade, "analise"),
    };
  }

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

export type RiscoPropriedade = { risco: Risco; analisadaEm: Date; talhoesAnalisados: number };

/**
 * Lista de propriedades (wireframe 2): para cada propriedade, o risco mais grave entre as últimas
 * análises válidas dos talhões e a data da análise mais recente. Propriedade sem análise fica fora.
 */
export async function riscosDasPropriedades(usuarioId: string): Promise<Map<string, RiscoPropriedade>> {
  const ultimas = await db.analise.findMany({
    where: { obsoleta: false, talhao: { propriedade: { usuarioId } } },
    orderBy: [{ talhaoId: "asc" }, { criadaEm: "desc" }],
    distinct: ["talhaoId"],
    select: { risco: true, criadaEm: true, talhao: { select: { propriedadeId: true } } },
  });
  const porPropriedade = new Map<string, { riscos: Risco[]; analisadaEm: Date }>();
  for (const a of ultimas) {
    const atual = porPropriedade.get(a.talhao.propriedadeId);
    if (!atual) porPropriedade.set(a.talhao.propriedadeId, { riscos: [a.risco], analisadaEm: a.criadaEm });
    else {
      atual.riscos.push(a.risco);
      if (a.criadaEm > atual.analisadaEm) atual.analisadaEm = a.criadaEm;
    }
  }
  const resultado = new Map<string, RiscoPropriedade>();
  for (const [id, { riscos, analisadaEm }] of porPropriedade) {
    resultado.set(id, { risco: riscoMaisGrave(riscos)!, analisadaEm, talhoesAnalisados: riscos.length });
  }
  return resultado;
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

/** US09: todas as análises do talhão, da mais recente para a mais antiga, com o dossiê emitido. */
export async function listarAnalises(usuarioId: string, talhaoId: string) {
  return db.analise.findMany({
    where: { talhaoId, talhao: { propriedade: { usuarioId } } },
    orderBy: { criadaEm: "desc" },
    select: {
      id: true,
      criadaEm: true,
      risco: true,
      areaSobrepostaHa: true,
      percentual: true,
      obsoleta: true,
      base: { select: { fonte: true, versao: true } },
      dossie: { select: { codigo: true, emitidoEm: true } },
    },
  });
}

export async function contarAnalises(usuarioId: string, talhaoId: string) {
  return db.analise.count({ where: { talhaoId, talhao: { propriedade: { usuarioId } } } });
}

/** Descrições das áreas cobertas pelas bases (mais recente primeiro), para a mensagem de "região sem dados". */
export async function descricoesCobertura(): Promise<(string | null)[]> {
  const bases = await db.baseAlertas.findMany({ orderBy: { importadaEm: "desc" }, select: { descricaoCobertura: true } });
  return bases.map((b) => b.descricaoCobertura);
}

/** Arredonda as coordenadas (5 casas ≈ 1 m) para enviar a cobertura ao mapa com menos bytes. */
function arredondar(coordenadas: unknown): unknown {
  return Array.isArray(coordenadas)
    ? coordenadas.map(arredondar)
    : typeof coordenadas === "number"
      ? Math.round(coordenadas * 1e5) / 1e5
      : coordenadas;
}

/**
 * Área coberta por todas as bases de alertas, para desenhar no editor de talhão. É dado de
 * referência público (limites de municípios), igual para todos os usuários.
 */
export async function obterCoberturas(): Promise<{ colecao: FeatureCollection; descricoes: string[] }> {
  const bases = await db.baseAlertas.findMany({
    orderBy: { importadaEm: "desc" },
    select: { fonte: true, versao: true, descricaoCobertura: true, cobertura: true },
  });
  const colecao: FeatureCollection = {
    type: "FeatureCollection",
    features: bases.map((b) => {
      const g = b.cobertura as unknown as GeometriaTalhao;
      return {
        type: "Feature",
        properties: { fonte: b.fonte, versao: b.versao, descricao: b.descricaoCobertura },
        geometry: { type: g.type, coordinates: arredondar(g.coordinates) } as GeometriaTalhao,
      };
    }),
  };
  const descricoes = [...new Set(bases.map((b) => b.descricaoCobertura).filter((d): d is string => Boolean(d)))];
  return { colecao, descricoes };
}
