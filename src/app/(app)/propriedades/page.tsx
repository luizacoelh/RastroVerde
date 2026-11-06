import type { Metadata } from "next";
import Link from "next/link";
import { LinkBotao, SeloRisco } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { riscosDasPropriedades } from "@/lib/dados/analises";
import { listarPropriedades } from "@/lib/dados/propriedades";
import { formatarHa } from "@/lib/geo/talhao";

export const metadata: Metadata = { title: "Minhas propriedades" };

const formatoDia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function PaginaPropriedades() {
  const usuario = await usuarioAtual();
  const [propriedades, riscos] = await Promise.all([
    listarPropriedades(usuario.id),
    riscosDasPropriedades(usuario.id),
  ]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Minhas propriedades</h1>
        <LinkBotao href="/propriedades/nova">+ Nova propriedade</LinkBotao>
      </div>

      {propriedades.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">Você ainda não cadastrou nenhuma propriedade.</p>
          <p className="mt-1 text-sm text-stone-600">
            Comece pela propriedade e depois desenhe os talhões no mapa.
          </p>
          <LinkBotao href="/propriedades/nova" className="mt-4">
            Cadastrar propriedade
          </LinkBotao>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Propriedades com o risco da última análise</caption>
              <thead className="border-b border-stone-200 text-stone-600">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Propriedade</th>
                  <th scope="col" className="px-4 py-2 font-medium">Município/UF</th>
                  <th scope="col" className="px-4 py-2 font-medium">Cultura</th>
                  <th scope="col" className="px-4 py-2 font-medium">Talhões</th>
                  <th scope="col" className="px-4 py-2 font-medium">Última análise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {propriedades.map((p) => {
                  const r = riscos.get(p.id);
                  const pendentes = p.qtdTalhoes - (r?.talhoesAnalisados ?? 0);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50">
                      <th scope="row" className="px-4 py-3 font-semibold">
                        <Link href={`/propriedades/${p.id}`} className="text-green-900 hover:underline">
                          {p.nome}
                        </Link>
                      </th>
                      <td className="px-4 py-3">
                        {p.municipio}/{p.uf}
                      </td>
                      <td className="px-4 py-3">{p.cultura}</td>
                      <td className="px-4 py-3">
                        {p.qtdTalhoes === 0 ? "—" : `${p.qtdTalhoes} · ${formatarHa(p.areaTotalHa)}`}
                      </td>
                      <td className="px-4 py-3" data-testid={`risco-${p.nome}`}>
                        {r ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <SeloRisco risco={r.risco} />
                            <span className="text-stone-600">{formatoDia.format(r.analisadaEm)}</span>
                            {pendentes > 0 ? (
                              <span className="text-xs text-stone-600">
                                ({pendentes} sem análise)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-stone-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-600">
            O risco da propriedade é o do talhão mais crítico na última análise de cada um.
          </p>
        </>
      )}
    </>
  );
}
