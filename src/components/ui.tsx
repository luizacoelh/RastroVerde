import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ROTULO_RISCO, type Risco } from "@/lib/risco";

export const classeBotao = {
  confirmarExclusao:
    "inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50",
  primario:
    "inline-flex items-center justify-center gap-2 rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:cursor-not-allowed disabled:opacity-50",
  secundario:
    "inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:cursor-not-allowed disabled:opacity-50",
  perigo:
    "inline-flex items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50",
};

export function LinkBotao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: keyof typeof classeBotao }) {
  return <Link className={`${classeBotao[variante]} ${className}`} {...props} />;
}

const classeEntrada =
  "block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30 aria-invalid:border-red-600";

type PropsCampo = {
  rotulo: string;
  nome: string;
  erros?: string[];
  dica?: ReactNode;
};

function Rodape({ id, erros, dica }: { id: string; erros?: string[]; dica?: ReactNode }) {
  return (
    <>
      {dica && !erros?.length ? <p className="mt-1 text-xs text-stone-600">{dica}</p> : null}
      {erros?.length ? (
        <p id={`${id}-erro`} className="mt-1 text-xs font-medium text-red-700">
          {erros[0]}
        </p>
      ) : null}
    </>
  );
}

export function Campo({ rotulo, nome, erros, dica, ...props }: PropsCampo & ComponentProps<"input">) {
  const id = props.id ?? nome;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-800">
        {rotulo}
      </label>
      <input
        id={id}
        name={nome}
        className={classeEntrada}
        aria-invalid={erros?.length ? true : undefined}
        aria-describedby={erros?.length ? `${id}-erro` : undefined}
        {...props}
      />
      <Rodape id={id} erros={erros} dica={dica} />
    </div>
  );
}

export function CampoSelecao({
  rotulo,
  nome,
  erros,
  dica,
  opcoes,
  ...props
}: PropsCampo & ComponentProps<"select"> & { opcoes: readonly string[] }) {
  const id = props.id ?? nome;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-800">
        {rotulo}
      </label>
      <select
        id={id}
        name={nome}
        className={classeEntrada}
        aria-invalid={erros?.length ? true : undefined}
        aria-describedby={erros?.length ? `${id}-erro` : undefined}
        {...props}
      >
        <option value="">Selecione…</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <Rodape id={id} erros={erros} dica={dica} />
    </div>
  );
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "info"; children: ReactNode }) {
  const cores =
    tipo === "erro" ? "border-red-200 bg-red-50 text-red-800" : "border-sky-200 bg-sky-50 text-sky-900";
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${cores}`}>
      {children}
    </div>
  );
}

export function Trilha({ itens }: { itens: { rotulo: string; href?: string }[] }) {
  return (
    <nav aria-label="Trilha" className="mb-4 text-sm text-stone-600">
      <ol className="flex flex-wrap items-center gap-1">
        {itens.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-green-800 hover:underline">
                {item.rotulo}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-stone-900">
                {item.rotulo}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold text-green-900">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          fill="currentColor"
          d="M17 3c-6.5 0-12 4.5-12 11 0 2 .6 3.8 1.6 5.3L4 22l1.4 1.4 2.6-2.6C9.4 21.6 11 22 12.7 22 18.5 22 21 16.5 21 9V3h-4Zm-4.3 17c-1.2 0-2.3-.3-3.3-.8L15 13.6 13.6 12.2 8 17.8A7.5 7.5 0 0 1 7 14c0-5.3 4.6-9 10-9h2v4c0 6.3-1.9 11-6.3 11Z"
        />
      </svg>
      RastroVerde
    </span>
  );
}

const ESTILO_RISCO: Record<Risco, { classe: string; simbolo: string }> = {
  BAIXO: { classe: "border-green-700 bg-green-50 text-green-900", simbolo: "✓" },
  ATENCAO: { classe: "border-amber-600 bg-amber-50 text-amber-900", simbolo: "!" },
  ALTO: { classe: "border-red-700 bg-red-50 text-red-900", simbolo: "✕" },
};

/** Selo de risco com cor, símbolo e texto (RNF09). */
export function SeloRisco({ risco, tamanho = "normal" }: { risco: Risco; tamanho?: "normal" | "grande" }) {
  const { classe, simbolo } = ESTILO_RISCO[risco];
  const medida = tamanho === "grande" ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${classe} ${medida}`}>
      <span aria-hidden="true">{simbolo}</span>
      Risco {ROTULO_RISCO[risco].toLowerCase()}
    </span>
  );
}
