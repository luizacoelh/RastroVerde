import type { Metadata } from "next";
import { FormCadastro } from "./form-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Criar conta</h1>
      <FormCadastro />
    </>
  );
}
