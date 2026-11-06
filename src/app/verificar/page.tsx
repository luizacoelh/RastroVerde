import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Aviso, classeBotao } from "@/components/ui";
import { normalizarCodigo } from "@/lib/dossie/conteudo";

export const metadata: Metadata = { title: "Verificar dossiê" };

/** Para quem tem só o código impresso no PDF (sem leitor de QR code). */
export default async function PaginaVerificar({ searchParams }: PageProps<"/verificar">) {
  const { codigo } = await searchParams;
  const digitado = typeof codigo === "string" ? codigo : undefined;
  const valido = digitado ? normalizarCodigo(digitado) : null;
  if (valido) redirect(`/verificar/${valido}`);

  return (
    <section className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Verificar um dossiê</h1>
      <p className="mt-1 text-sm text-stone-600">
        Digite o código impresso no dossiê ou leia o QR code com a câmera do celular.
      </p>
      <form method="get" className="mt-4 space-y-3">
        {digitado ? <Aviso>Código inválido. O formato é RV-2026-XXXXXX.</Aviso> : null}
        <div>
          <label htmlFor="codigo" className="mb-1 block text-sm font-medium text-stone-800">
            Código do dossiê
          </label>
          <input
            id="codigo"
            name="codigo"
            required
            placeholder="RV-2026-8F3K2Q"
            defaultValue={digitado}
            autoCapitalize="characters"
            className="block w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm uppercase shadow-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30"
          />
        </div>
        <button type="submit" className={`${classeBotao.primario} w-full`}>
          Verificar
        </button>
      </form>
    </section>
  );
}
