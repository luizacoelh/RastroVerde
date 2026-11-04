import type { Metadata } from "next";
import { Trilha } from "@/components/ui";
import { criarPropriedade } from "../actions";
import { FormPropriedade } from "../form-propriedade";

export const metadata: Metadata = { title: "Nova propriedade" };

export default function PaginaNovaPropriedade() {
  return (
    <>
      <Trilha itens={[{ rotulo: "Propriedades", href: "/propriedades" }, { rotulo: "Nova" }]} />
      <h1 className="mb-6 text-2xl font-semibold">Nova propriedade</h1>
      <FormPropriedade acao={criarPropriedade} voltarPara="/propriedades" rotuloEnviar="Cadastrar" />
    </>
  );
}
