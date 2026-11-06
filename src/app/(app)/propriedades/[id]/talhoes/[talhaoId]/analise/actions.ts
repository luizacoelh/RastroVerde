"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/dal";
import { executarAnalise } from "@/lib/dados/analises";
import { emitirDossie } from "@/lib/dados/dossies";
import { urlBase } from "@/lib/url";

export type EstadoAnalise = { mensagem?: string };

/** UC4 — analisa o talhão. Ids vêm do bind, mas executarAnalise confere o dono (RF20). */
// Usada com useActionState: o estado anterior e o FormData não são necessários.
export async function analisarTalhao(propriedadeId: string, talhaoId: string): Promise<EstadoAnalise> {
  const usuario = await usuarioAtual();
  const resultado = await executarAnalise(usuario.id, propriedadeId, talhaoId);
  if (!resultado.ok) {
    return {
      mensagem:
        "Região sem dados: a base de alertas importada não cobre toda a área deste talhão. O risco não foi calculado.",
    };
  }
  revalidatePath(`/propriedades/${propriedadeId}`);
  redirect(`/propriedades/${propriedadeId}/talhoes/${talhaoId}/analise`);
}

/** US10 — gera (ou reabre) o dossiê da análise atual. emitirDossie confere o dono (RF20). */
export async function gerarDossie(propriedadeId: string, talhaoId: string): Promise<EstadoAnalise> {
  const usuario = await usuarioAtual();
  const resultado = await emitirDossie(usuario.id, propriedadeId, talhaoId, await urlBase());
  if (!resultado.ok) return { mensagem: resultado.erro };
  revalidatePath(`/propriedades/${propriedadeId}`);
  redirect(`/propriedades/${propriedadeId}/talhoes/${talhaoId}/analise`);
}
