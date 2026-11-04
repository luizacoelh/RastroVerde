"use server";

import bcrypt from "bcryptjs";
import * as z from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import {
  caminhoInternoSeguro,
  esquemaCadastro,
  esquemaLogin,
  valoresDoFormulario,
  type EstadoFormulario,
} from "@/lib/validacao";

const CUSTO_BCRYPT = 10;

export async function cadastrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDoFormulario(formData, ["nome", "email"]);
  const dados = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erros: z.flattenError(dados.error).fieldErrors, valores };
  }

  const { nome, email, senha } = dados.data;
  const existente = await db.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existente) {
    return { erros: { email: ["Já existe uma conta com este e-mail."] }, valores };
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  try {
    await db.usuario.create({ data: { nome, email, senhaHash } });
  } catch (erro) {
    // Dois cadastros simultâneos com o mesmo e-mail: a restrição UNIQUE decide.
    if ((erro as { code?: string }).code === "P2002") {
      return { erros: { email: ["Já existe uma conta com este e-mail."] }, valores };
    }
    throw erro;
  }

  // Entra direto após o cadastro (signIn redireciona lançando NEXT_REDIRECT).
  await signIn("credentials", { email, senha, redirectTo: "/propriedades" });
  return {};
}

export async function entrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = valoresDoFormulario(formData, ["email"]);
  const dados = esquemaLogin.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erros: z.flattenError(dados.error).fieldErrors, valores };
  }

  try {
    await signIn("credentials", {
      ...dados.data,
      redirectTo: caminhoInternoSeguro(formData.get("callbackUrl")),
    });
  } catch (erro) {
    if (erro instanceof AuthError) {
      return { mensagem: "E-mail ou senha incorretos.", valores };
    }
    throw erro; // NEXT_REDIRECT precisa continuar subindo
  }
  return {};
}

export async function sair() {
  await signOut({ redirectTo: "/login" });
}
