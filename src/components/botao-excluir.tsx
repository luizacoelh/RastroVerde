"use client";

import { useState, useTransition } from "react";
import { classeBotao } from "@/components/ui";

export type ResultadoExclusao = { erro?: string } | void;

/**
 * Botão de exclusão com confirmação na própria tela (sem diálogo do navegador).
 * Com `bloqueio`, o botão fica desativado e o motivo aparece ao lado (ex.: RN04).
 */
export function BotaoExcluir({
  acao,
  rotulo = "Excluir",
  confirmacao,
  bloqueio,
}: {
  acao: () => Promise<ResultadoExclusao>;
  rotulo?: string;
  confirmacao: string;
  bloqueio?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (bloqueio || erro) {
    return (
      <div className="flex max-w-md flex-wrap items-center gap-2">
        <button type="button" className={classeBotao.perigo} disabled aria-describedby="motivo-bloqueio">
          {rotulo}
        </button>
        <p id="motivo-bloqueio" role={erro ? "alert" : undefined} className="text-sm text-stone-700">
          {erro ?? bloqueio}
        </p>
      </div>
    );
  }

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
        onClick={() =>
          iniciar(async () => {
            const resultado = await acao();
            if (resultado?.erro) {
              setConfirmando(false);
              setErro(resultado.erro);
            }
          })
        }
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
