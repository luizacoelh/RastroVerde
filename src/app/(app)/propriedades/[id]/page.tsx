import type { Metadata } from "next";
import { BotaoExcluir } from "@/components/botao-excluir";
import { MapaTalhoes } from "@/components/mapa/mapa-talhoes";
import { LinkBotao, Trilha } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { listarTalhoes, obterPropriedade } from "@/lib/dados/propriedades";
import { colecaoDeTalhoes } from "@/lib/geo/colecao";
import { formatarHa } from "@/lib/geo/talhao";
import { excluirPropriedade } from "../actions";

export const metadata: Metadata = { title: "Propriedade" };

export default async function PaginaPropriedade({ params }: PageProps<"/propriedades/[id]">) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  const p = await obterPropriedade(usuario.id, id);
  const talhoes = await listarTalhoes(usuario.id, p.id);
  const areaTotal = talhoes.reduce((s, t) => s + t.areaHa, 0);

  return (
    <>
      <Trilha itens={[{ rotulo: "Propriedades", href: "/propriedades" }, { rotulo: p.nome }]} />

      <section className="mb-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{p.nome}</h1>
            <p className="text-stone-600">
              {p.municipio}/{p.uf} · {p.cultura}
            </p>
            <p className="mt-1 text-sm text-stone-600">CAR: {p.car ?? "não informado"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkBotao variante="secundario" href={`/propriedades/${p.id}/editar`}>
              Editar
            </LinkBotao>
            <BotaoExcluir
              acao={excluirPropriedade.bind(null, p.id)}
              confirmacao={
                talhoes.length > 0
                  ? `Excluir a propriedade e seus ${talhoes.length} talhão(ões)?`
                  : "Excluir esta propriedade?"
              }
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Talhões{" "}
            {talhoes.length > 0 ? (
              <span className="font-normal text-stone-600">
                ({talhoes.length} · {formatarHa(areaTotal)})
              </span>
            ) : null}
          </h2>
          <LinkBotao href={`/propriedades/${p.id}/talhoes/novo`}>+ Desenhar talhão</LinkBotao>
        </div>

        {talhoes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
            Nenhum talhão ainda. Desenhe no mapa a área exata de produção.
          </p>
        ) : (
          <>
            <div className="mb-3">
              <MapaTalhoes talhoes={colecaoDeTalhoes(talhoes)} />
            </div>
            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
              {talhoes.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-sm text-stone-600">{formatarHa(t.areaHa)}</p>
                  </div>
                  <LinkBotao variante="secundario" href={`/propriedades/${p.id}/talhoes/${t.id}`}>
                    Ver / editar
                  </LinkBotao>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
