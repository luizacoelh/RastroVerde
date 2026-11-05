"use client";

import { useState, useTransition } from "react";
import { classeBotao } from "@/components/ui";

/** Botão de exclusão com confirmação na própria tela (sem diálogo do navegador). */
export function BotaoExcluir({
  acao,
  rotulo = "Excluir",
  confirmacao,
}: {
  acao: () => Promise<void>;
  rotulo?: string;
  confirmacao: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();

  if (!confirmando) {
    return (
      <button type="button" className={classeBotao.perigo} onClick={() => setConfirmando(true)}>
        {rotulo}
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={confirmacao} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-red-800">{confirmacao}</span>
      <button
        type="button"
        className={classeBotao.confirmarExclusao}
        disabled={pendente}
        onClick={() => iniciar(() => acao())}
        autoFocus
      >
        {pendente ? "Excluindo…" : "Sim, excluir"}
      </button>
      <button
        type="button"
        className={classeBotao.secundario}
        disabled={pendente}
        onClick={() => setConfirmando(false)}
      >
        Cancelar
      </button>
    </div>
  );
}
