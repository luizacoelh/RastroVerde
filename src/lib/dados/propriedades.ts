// Consultas de propriedades e talhões. Todas filtram pelo dono (RF20/RNF04).
import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { GeometriaTalhao } from "@/lib/geo/talhao";

export async function listarPropriedades(usuarioId: string) {
  const propriedades = await db.propriedade.findMany({
    where: { usuarioId },
    orderBy: { nome: "asc" },
    include: { talhoes: { select: { areaHa: true } } },
  });
  return propriedades.map(({ talhoes, ...p }) => ({
    ...p,
    qtdTalhoes: talhoes.length,
    areaTotalHa: talhoes.reduce((soma, t) => soma + t.areaHa, 0),
  }));
}

/** Propriedade do usuário ou 404 (não revela se o id existe para outro dono). */
export async function obterPropriedade(usuarioId: string, id: string) {
  const propriedade = await db.propriedade.findFirst({ where: { id, usuarioId } });
  if (!propriedade) notFound();
  return propriedade;
}

export async function listarTalhoes(usuarioId: string, propriedadeId: string) {
  const talhoes = await db.talhao.findMany({
    where: { propriedadeId, propriedade: { usuarioId } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, areaHa: true, geometria: true, alteradoEm: true },
  });
  return talhoes.map((t) => ({ ...t, geometria: t.geometria as unknown as GeometriaTalhao }));
}

export async function obterTalhao(usuarioId: string, propriedadeId: string, id: string) {
  const talhao = await db.talhao.findFirst({
    where: { id, propriedadeId, propriedade: { usuarioId } },
  });
  if (!talhao) notFound();
  return { ...talhao, geometria: talhao.geometria as unknown as GeometriaTalhao };
}
