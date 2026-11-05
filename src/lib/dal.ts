// Camada de acesso a dados: toda leitura/escrita parte do usuário da sessão (RF20/RNF04).
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type UsuarioSessao = { id: string; nome: string };

/** Usuário logado; redireciona para /login se não houver sessão válida. */
export const usuarioAtual = cache(async (): Promise<UsuarioSessao> => {
  const sessao = await auth();
  const id = sessao?.user?.id;
  if (!id) redirect("/login");
  return { id, nome: sessao.user?.name ?? "" };
});
