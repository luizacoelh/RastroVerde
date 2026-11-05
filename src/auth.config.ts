// Configuração do Auth.js sem dependências de banco/bcrypt, usada também pelo proxy.
import type { NextAuthConfig } from "next-auth";

const ROTAS_PUBLICAS = ["/login", "/cadastro"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Checagem otimista no proxy. A autorização de verdade é feita no servidor (src/lib/dal.ts).
    authorized({ auth, request: { nextUrl } }) {
      const logado = Boolean(auth?.user);
      const publica = ROTAS_PUBLICAS.some((r) => nextUrl.pathname === r || nextUrl.pathname.startsWith(`${r}/`));
      if (publica) {
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
