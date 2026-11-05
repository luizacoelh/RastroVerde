"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { entrar } from "../actions";

export function FormLogin({ callbackUrl }: { callbackUrl?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, {});
  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.mensagem ? <Aviso>{estado.mensagem}</Aviso> : null}
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <Campo
        rotulo="E-mail"
        nome="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={estado.valores?.email}
        erros={estado.erros?.email}
      />
      <Campo
        rotulo="Senha"
        nome="senha"
        type="password"
        autoComplete="current-password"
        required
        erros={estado.erros?.senha}
      />
      <button type="submit" className={`${classeBotao.primario} w-full`} disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-green-800 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
