"use client";

import { useActionState } from "react";
import { Aviso, classeBotao } from "@/components/ui";
import type { EstadoAnalise } from "./actions";

export function BotaoAnalisar({
  acao,
  rotulo,
  rotuloPendente = "Analisando…",
  variante = "primario",
}: {
  acao: (estado: EstadoAnalise, formData: FormData) => Promise<EstadoAnalise>;
  rotulo: string;
  rotuloPendente?: string;
  variante?: "primario" | "secundario";
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="space-y-3">
      {estado.mensagem ? <Aviso tipo="info">{estado.mensagem}</Aviso> : null}
      <button type="submit" className={`${classeBotao[variante]} w-full`} disabled={pendente}>
        {pendente ? rotuloPendente : rotulo}
      </button>
    </form>
  );
}
