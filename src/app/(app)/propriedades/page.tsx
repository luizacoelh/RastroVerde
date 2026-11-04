import type { Metadata } from "next";
import Link from "next/link";
import { LinkBotao } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { listarPropriedades } from "@/lib/dados/propriedades";
import { formatarHa } from "@/lib/geo/talhao";

export const metadata: Metadata = { title: "Minhas propriedades" };

export default async function PaginaPropriedades() {
  const usuario = await usuarioAtual();
  const propriedades = await listarPropriedades(usuario.id);

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
        <ul className="grid gap-3 sm:grid-cols-2">
          {propriedades.map((p) => (
            <li key={p.id}>
              <Link
                href={`/propriedades/${p.id}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-green-700"
              >
                <p className="font-semibold text-stone-900">{p.nome}</p>
                <p className="text-sm text-stone-600">
                  {p.municipio}/{p.uf} · {p.cultura}
                </p>
                <p className="mt-2 text-sm text-stone-700">
                  {p.qtdTalhoes === 0
                    ? "Nenhum talhão"
                    : `${p.qtdTalhoes} ${p.qtdTalhoes === 1 ? "talhão" : "talhões"} · ${formatarHa(p.areaTotalHa)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
