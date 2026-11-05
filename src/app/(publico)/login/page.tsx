import type { Metadata } from "next";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Entrar</h1>
      <FormLogin callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
    </>
  );
}
