import type { Metadata } from "next";
import Link from "next/link";
import { LinkBotao, SeloRisco, Trilha } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { listarAnalises } from "@/lib/dados/analises";
import { obterPropriedade, obterTalhao } from "@/lib/dados/propriedades";
import { formatoDataHora } from "@/lib/formato";
import { formatarPercentual } from "@/lib/geo/analise";
import { formatarHa } from "@/lib/geo/talhao";

export const metadata: Metadata = { title: "Histórico de análises" };

/** US09 — histórico de análises do talhão (RF13). */
export default async function PaginaHistorico({
  params,
}: PageProps<"/propriedades/[id]/talhoes/[talhaoId]/analise/historico">) {
  const { id, talhaoId } = await params;
  const usuario = await usuarioAtual();
  const p = await obterPropriedade(usuario.id, id);
  const t = await obterTalhao(usuario.id, p.id, talhaoId);
  const analises = await listarAnalises(usuario.id, t.id);
  const atualId = analises.find((a) => !a.obsoleta)?.id;
  const urlAnalise = `/propriedades/${p.id}/talhoes/${t.id}/analise`;

  return (
    <>
      <Trilha
        itens={[
          { rotulo: "Propriedades", href: "/propriedades" },
          { rotulo: p.nome, href: `/propriedades/${p.id}` },
          { rotulo: t.nome, href: `/propriedades/${p.id}/talhoes/${t.id}` },
          { rotulo: "Análise", href: urlAnalise },
          { rotulo: "Histórico" },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Histórico de análises</h1>
        <LinkBotao variante="secundario" href={urlAnalise}>
          Voltar à análise
        </LinkBotao>
      </div>

      {analises.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          Este talhão ainda não foi analisado.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Análises do talhão {t.nome}, da mais recente para a mais antiga</caption>
              <thead className="border-b border-stone-200 text-stone-600">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Analisado em</th>
                  <th scope="col" className="px-4 py-2 font-medium">Risco</th>
                  <th scope="col" className="px-4 py-2 font-medium">Área sobreposta</th>
                  <th scope="col" className="px-4 py-2 font-medium">Base</th>
                  <th scope="col" className="px-4 py-2 font-medium">Situação</th>
                  <th scope="col" className="px-4 py-2 font-medium">Dossiê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {analises.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatoDataHora.format(a.criadaEm)}</td>
                    <td className="px-4 py-3">
                      <SeloRisco risco={a.risco} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatarHa(a.areaSobrepostaHa)} ({formatarPercentual(a.percentual)})
                    </td>
                    <td className="px-4 py-3">
                      {a.base.fonte} {a.base.versao}
                    </td>
                    <td className="px-4 py-3">
                      {a.obsoleta ? (
                        <span className="text-stone-600">Obsoleta: o polígono mudou depois</span>
                      ) : a.id === atualId ? (
                        <Link href={urlAnalise} className="font-medium text-green-800 hover:underline">
                          Atual
                        </Link>
                      ) : (
                        <span className="text-stone-600">Substituída por análise mais nova</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {a.dossie ? (
                        <a href={`/dossies/${a.dossie.codigo}/pdf`} className="font-medium text-green-800 hover:underline">
                          {a.dossie.codigo}
                        </a>
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-600">
            Editar o polígono torna as análises anteriores obsoletas (RN03): elas ficam no histórico, mas não
            geram novos dossiês. Dossiês já emitidos continuam válidos.
          </p>
        </>
      )}
    </>
  );
}
