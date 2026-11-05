import type { Metadata } from "next";
import { BotaoExcluir } from "@/components/botao-excluir";
import { LinkBotao, Trilha } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { listarTalhoes, obterPropriedade, obterTalhao } from "@/lib/dados/propriedades";
import { colecaoDeTalhoes } from "@/lib/geo/colecao";
import { excluirTalhao, salvarTalhao } from "../actions";
import { FormTalhao } from "../form-talhao";

export const metadata: Metadata = { title: "Talhão" };

export default async function PaginaTalhao({ params }: PageProps<"/propriedades/[id]/talhoes/[talhaoId]">) {
  const { id, talhaoId } = await params;
  const usuario = await usuarioAtual();
  const p = await obterPropriedade(usuario.id, id);
  const t = await obterTalhao(usuario.id, p.id, talhaoId);
  const outros = (await listarTalhoes(usuario.id, p.id)).filter((o) => o.id !== t.id);

  return (
    <>
      <Trilha
        itens={[
          { rotulo: "Propriedades", href: "/propriedades" },
          { rotulo: p.nome, href: `/propriedades/${p.id}` },
          { rotulo: t.nome },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.nome}</h1>
        <div className="flex flex-wrap gap-2">
          <LinkBotao variante="secundario" href={`/propriedades/${p.id}/talhoes/${t.id}/analise`}>
            Ver análise
          </LinkBotao>
          <BotaoExcluir acao={excluirTalhao.bind(null, p.id, t.id)} confirmacao="Excluir este talhão?" />
        </div>
      </div>
      <FormTalhao
        acao={salvarTalhao.bind(null, p.id, t.id)}
        nomeInicial={t.nome}
        geometriaInicial={t.geometria}
        outros={colecaoDeTalhoes(outros)}
        voltarPara={`/propriedades/${p.id}`}
      />
    </>
  );
}
