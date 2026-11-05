import type { Metadata } from "next";
import { Trilha } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { listarTalhoes, obterPropriedade } from "@/lib/dados/propriedades";
import { colecaoDeTalhoes } from "@/lib/geo/colecao";
import { salvarTalhao } from "../actions";
import { FormTalhao } from "../form-talhao";

export const metadata: Metadata = { title: "Desenhar talhão" };

export default async function PaginaNovoTalhao({ params }: PageProps<"/propriedades/[id]/talhoes/novo">) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  const p = await obterPropriedade(usuario.id, id);
  const talhoes = await listarTalhoes(usuario.id, p.id);

  return (
    <>
      <Trilha
        itens={[
          { rotulo: "Propriedades", href: "/propriedades" },
          { rotulo: p.nome, href: `/propriedades/${p.id}` },
          { rotulo: "Desenhar talhão" },
        ]}
      />
      <h1 className="mb-4 text-2xl font-semibold">Desenhar talhão</h1>
      <FormTalhao
        acao={salvarTalhao.bind(null, p.id, null)}
        nomeInicial={`Talhão ${talhoes.length + 1}`}
        outros={colecaoDeTalhoes(talhoes)}
        voltarPara={`/propriedades/${p.id}`}
      />
    </>
  );
}
