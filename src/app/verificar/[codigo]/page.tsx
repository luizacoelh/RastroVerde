import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SeloRisco } from "@/components/ui";
import { obterVerificacao } from "@/lib/dados/dossies";
import { normalizarCodigo } from "@/lib/dossie/conteudo";
import { formatoData, formatoDataHora } from "@/lib/formato";
import { formatarPercentual } from "@/lib/geo/analise";
import { formatarHa } from "@/lib/geo/talhao";
import { ConferirArquivo } from "./conferir-arquivo";

export const metadata: Metadata = { title: "Verificação de dossiê" };

const AVISO =
  "Página pública acessada pelo QR code. Não exibe dados pessoais do produtor. Este dossiê não substitui a declaração oficial de diligência devida do EUDR.";

/** US12 — validade, data, risco e hash do dossiê (RF18), sem login e sem dados pessoais (RNF06). */
export default async function PaginaVerificacao({ params }: PageProps<"/verificar/[codigo]">) {
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(bruto);
  const v = codigo ? await obterVerificacao(codigo) : null;

  if (!v) {
    return (
      <section className="mx-auto max-w-xl rounded-lg border-2 border-red-300 bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-red-800">
          <span aria-hidden="true">✕</span> Dossiê não encontrado
        </h1>
        <p className="mt-2 text-sm text-stone-700">
          Nenhum dossiê foi emitido com o código{" "}
          <span className="break-all font-mono">{codigo ?? decodeURIComponent(bruto).slice(0, 40)}</span>. Confira se o
          código foi digitado corretamente. Se ele veio impresso num documento, o documento pode não ser autêntico.
        </p>
        <Link href="/verificar" className="mt-4 inline-block text-sm font-medium text-green-800 hover:underline">
          Verificar outro código
        </Link>
      </section>
    );
  }

  const linhas: [string, ReactNode][] = [
    ["Código", <span key="c" className="font-mono">{v.codigo}</span>],
    ["Emitido em", formatoData.format(v.emitidoEm)],
    ["Cultura / Município", `${v.cultura} · ${v.municipio}/${v.uf}`],
    ["Risco", <SeloRisco key="r" risco={v.risco} />],
    ["Área do talhão", formatarHa(v.areaTalhaoHa)],
    ["Área sobreposta a alertas após 31/12/2020", `${formatarHa(v.areaSobrepostaHa)} (${formatarPercentual(v.percentual)})`],
    ["Base de alertas", `${v.fonte}, versão ${v.versao}`],
    ["Analisado em", formatoDataHora.format(v.analisadaEm)],
    [
      "Hash SHA-256 do PDF",
      <span key="h" className="break-all font-mono text-xs" data-testid="hash">
        {v.hash}
      </span>,
    ],
  ];

  return (
    <section className="mx-auto max-w-xl space-y-4 rounded-lg border-2 border-green-700 bg-white p-6 shadow-sm">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-green-900">
        <span aria-hidden="true">✓</span> Dossiê autêntico
      </h1>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Dados do dossiê {v.codigo}</caption>
        <tbody className="divide-y divide-stone-200 border-y border-stone-200">
          {linhas.map(([rotulo, valor]) => (
            <tr key={rotulo}>
              <th scope="row" className="w-2/5 py-2 pr-3 align-top font-medium text-stone-600">
                {rotulo}
              </th>
              <td className="py-2">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConferirArquivo hashEsperado={v.hash} />
      <p className="text-xs text-stone-600">{AVISO}</p>
    </section>
  );
}
