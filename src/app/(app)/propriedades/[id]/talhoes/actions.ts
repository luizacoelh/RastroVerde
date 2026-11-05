"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/dal";
import { obterPropriedade } from "@/lib/dados/propriedades";
import { validarGeometriaTalhao } from "@/lib/geo/talhao";
import { esquemaTalhao, valoresDoFormulario, type EstadoFormulario } from "@/lib/validacao";

/**
 * Cria (talhaoId = null) ou atualiza um talhão. A geometria vem do mapa como JSON e é
 * validada de novo aqui — o servidor é a autoridade (RF05).
 */
export async function salvarTalhao(
  propriedadeId: string,
  talhaoId: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual();
  await obterPropriedade(usuario.id, propriedadeId); // 404 se não for do usuário

  const valores = valoresDoFormulario(formData, ["nome", "geometria"]);
  const dados = esquemaTalhao.safeParse(valores);
  if (!dados.success) return { erros: z.flattenError(dados.error).fieldErrors, valores };

  let geojson: unknown;
  try {
    geojson = JSON.parse(dados.data.geometria);
  } catch {
    return { erros: { geometria: ["Geometria inválida."] }, valores };
  }
  const validacao = validarGeometriaTalhao(geojson);
  if (!validacao.ok) return { erros: { geometria: [validacao.erro] }, valores };

  const { geometria, areaHa, bbox } = validacao;
  const campos = {
    nome: dados.data.nome,
    geometria: geometria as unknown as Prisma.InputJsonObject,
    areaHa,
    bboxMinLng: bbox[0],
    bboxMinLat: bbox[1],
    bboxMaxLng: bbox[2],
    bboxMaxLat: bbox[3],
  };

  if (talhaoId === null) {
    await db.talhao.create({ data: { ...campos, propriedadeId } });
  } else {
    const atual = await db.talhao.findFirst({
      where: { id: talhaoId, propriedadeId, propriedade: { usuarioId: usuario.id } },
      select: { geometria: true },
    });
    if (!atual) notFound();

    const anterior = atual.geometria as { type?: unknown; coordinates?: unknown };
    const geometriaMudou =
      anterior.type !== geometria.type ||
      JSON.stringify(anterior.coordinates) !== JSON.stringify(geometria.coordinates);
    await db.$transaction([
      db.talhao.update({ where: { id: talhaoId }, data: campos }),
      // RN03: análises feitas sobre o polígono antigo não valem para novos dossiês.
      ...(geometriaMudou
        ? [db.analise.updateMany({ where: { talhaoId, obsoleta: false }, data: { obsoleta: true } })]
        : []),
    ]);
  }

  revalidatePath(`/propriedades/${propriedadeId}`);
  redirect(`/propriedades/${propriedadeId}`);
}

export async function excluirTalhao(propriedadeId: string, talhaoId: string) {
  const usuario = await usuarioAtual();
  const { count } = await db.talhao.deleteMany({
    where: { id: talhaoId, propriedadeId, propriedade: { usuarioId: usuario.id } },
  });
  if (count === 0) notFound();

  revalidatePath(`/propriedades/${propriedadeId}`);
  redirect(`/propriedades/${propriedadeId}`);
}
