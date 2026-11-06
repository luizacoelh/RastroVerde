"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { ResultadoExclusao } from "@/components/botao-excluir";
import { MOTIVO_BLOQUEIO_PROPRIEDADE, contarDossies } from "@/lib/dados/dossies";
import { db, violouChaveEstrangeira } from "@/lib/db";
import { usuarioAtual } from "@/lib/dal";
import { esquemaPropriedade, valoresDoFormulario, type EstadoFormulario } from "@/lib/validacao";

const CAMPOS = ["nome", "municipio", "uf", "cultura", "car"] as const;

function lerFormulario(formData: FormData) {
  const valores = valoresDoFormulario(formData, CAMPOS);
  return { valores, dados: esquemaPropriedade.safeParse(valores) };
}

export async function criarPropriedade(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual();
  const { valores, dados } = lerFormulario(formData);
  if (!dados.success) return { erros: z.flattenError(dados.error).fieldErrors, valores };

  const propriedade = await db.propriedade.create({ data: { ...dados.data, usuarioId: usuario.id } });
  revalidatePath("/propriedades");
  redirect(`/propriedades/${propriedade.id}`);
}

export async function atualizarPropriedade(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await usuarioAtual();
  const { valores, dados } = lerFormulario(formData);
  if (!dados.success) return { erros: z.flattenError(dados.error).fieldErrors, valores };

  // updateMany com o dono no filtro: atualiza só se a propriedade for do usuário.
  const { count } = await db.propriedade.updateMany({ where: { id, usuarioId: usuario.id }, data: dados.data });
  if (count === 0) notFound();

  revalidatePath("/propriedades");
  redirect(`/propriedades/${id}`);
}

export async function excluirPropriedade(id: string): Promise<ResultadoExclusao> {
  const usuario = await usuarioAtual();
  // RN04: os talhões seriam excluídos em cascata, então dossiê emitido bloqueia a propriedade.
  if ((await contarDossies(usuario.id, id)) > 0) return { erro: MOTIVO_BLOQUEIO_PROPRIEDADE };
  let count: number;
  try {
    ({ count } = await db.propriedade.deleteMany({ where: { id, usuarioId: usuario.id } }));
  } catch (e) {
    if (violouChaveEstrangeira(e)) return { erro: MOTIVO_BLOQUEIO_PROPRIEDADE };
    throw e;
  }
  if (count === 0) notFound();

  revalidatePath("/propriedades");
  redirect("/propriedades");
}
