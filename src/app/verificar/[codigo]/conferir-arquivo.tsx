"use client";

import { useState } from "react";

type Estado =
  | { tipo: "inicial" }
  | { tipo: "calculando" }
  | { tipo: "confere" }
  | { tipo: "diferente"; hash: string };

/** Calcula o SHA-256 do PDF no próprio navegador (o arquivo não é enviado) e compara (RF17). */
export function ConferirArquivo({ hashEsperado }: { hashEsperado: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });

  async function conferir(arquivo: File | undefined) {
    if (!arquivo) return;
    setEstado({ tipo: "calculando" });
    const resumo = await crypto.subtle.digest("SHA-256", await arquivo.arrayBuffer());
    const hash = Array.from(new Uint8Array(resumo), (b) => b.toString(16).padStart(2, "0")).join("");
    setEstado(hash === hashEsperado ? { tipo: "confere" } : { tipo: "diferente", hash });
  }

  return (
    <div className="space-y-2">
      <label htmlFor="arquivo-dossie" className="block text-sm font-medium text-stone-800">
        Conferir o arquivo PDF recebido
      </label>
      <input
        id="arquivo-dossie"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => conferir(e.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold"
      />
      <p className="text-xs text-stone-600">O arquivo é conferido no seu navegador e não é enviado a ninguém.</p>
      <div role="status" aria-live="polite" className="text-sm">
        {estado.tipo === "calculando" ? <p>Calculando…</p> : null}
        {estado.tipo === "confere" ? (
          <p className="font-semibold text-green-800">O arquivo confere: é exatamente o dossiê emitido.</p>
        ) : null}
        {estado.tipo === "diferente" ? (
          <p className="font-semibold text-red-800">
            O arquivo não confere: ele foi alterado ou é de outro dossiê.
            <span className="mt-1 block break-all font-mono text-xs font-normal">Hash do arquivo: {estado.hash}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
