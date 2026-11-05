import type { Metadata } from "next";
import { Trilha } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { obterPropriedade } from "@/lib/dados/propriedades";
import { atualizarPropriedade } from "../../actions";
import { FormPropriedade } from "../../form-propriedade";

export const metadata: Metadata = { title: "Editar propriedade" };

export default async function PaginaEditarPropriedade({ params }: PageProps<"/propriedades/[id]/editar">) {
  const { id } = await params;
  const usuario = await usuarioAtual();
  const p = await obterPropriedade(usuario.id, id);

  return (
    <>
      <Trilha
        itens={[
          { rotulo: "Propriedades", href: "/propriedades" },
          { rotulo: p.nome, href: `/propriedades/${p.id}` },
          { rotulo: "Editar" },
        ]}
      />
      <h1 className="mb-6 text-2xl font-semibold">Editar propriedade</h1>
      <FormPropriedade
        acao={atualizarPropriedade.bind(null, p.id)}
        inicial={{ nome: p.nome, municipio: p.municipio, uf: p.uf, cultura: p.cultura, car: p.car ?? "" }}
        voltarPara={`/propriedades/${p.id}`}
        rotuloEnviar="Salvar alterações"
      />
    </>
  );
}
