import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

// Página pública (US12): sem login, sem dados pessoais (RNF06) e fora dos buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutVerificacao({ children }: LayoutProps<"/verificar">) {
  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link href="/verificar" aria-label="RastroVerde — verificação de dossiê">
            <Logo />
          </Link>
          <span className="text-stone-500" aria-hidden="true">
            ·
          </span>
          <span className="font-semibold text-stone-800">Verificação de dossiê</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
