// Configuração do Auth.js sem dependências de banco/bcrypt, usada também pelo proxy.
import type { NextAuthConfig } from "next-auth";

const ROTAS_PUBLICAS = ["/login", "/cadastro"];
/** Abertas a todos, com ou sem sessão: verificação do dossiê pelo comprador (US12). */
const ROTAS_ABERTAS = ["/verificar"];

const casa = (rotas: string[], caminho: string) => rotas.some((r) => caminho === r || caminho.startsWith(`${r}/`));

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Checagem otimista no proxy. A autorização de verdade é feita no servidor (src/lib/dal.ts).
    authorized({ auth, request: { nextUrl } }) {
      const logado = Boolean(auth?.user);
      if (casa(ROTAS_ABERTAS, nextUrl.pathname)) return true;
      if (casa(ROTAS_PUBLICAS, nextUrl.pathname)) {
        return logado ? Response.redirect(new URL("/propriedades", nextUrl)) : true;
      }
      return logado; // false → redireciona para /login?callbackUrl=...
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
