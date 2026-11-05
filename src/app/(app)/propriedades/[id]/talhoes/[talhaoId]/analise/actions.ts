"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/dal";
import { executarAnalise } from "@/lib/dados/analises";

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
