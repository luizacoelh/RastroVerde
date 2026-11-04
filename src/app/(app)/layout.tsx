import Link from "next/link";
import { Logo } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { sair } from "../(publico)/actions";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const usuario = await usuarioAtual();
  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/propriedades" aria-label="RastroVerde — minhas propriedades">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-700 sm:inline">{usuario.nome}</span>
            <form action={sair}>
              <button type="submit" className="font-semibold text-green-800 hover:underline">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
