"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { cadastrar } from "../actions";

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, {});
  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.mensagem ? <Aviso>{estado.mensagem}</Aviso> : null}
      <Campo
        rotulo="Nome"
        nome="nome"
        autoComplete="name"
        required
        defaultValue={estado.valores?.nome}
        erros={estado.erros?.nome}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        dica="Mínimo de 8 caracteres."
        erros={estado.erros?.senha}
      />
      <button type="submit" className={`${classeBotao.primario} w-full`} disabled={pendente}>
        {pendente ? "Criando conta…" : "Criar conta"}
      </button>
      <p className="text-xs text-stone-600">
        Guardamos apenas seu nome e e-mail, para identificar sua conta (LGPD).
      </p>
      <p className="text-center text-sm text-stone-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-green-800 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
