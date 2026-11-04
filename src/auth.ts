import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { esquemaLogin } from "@/lib/validacao";
import { authConfig } from "./auth.config";

// Hash de uma senha aleatória descartada: comparar contra ele quando o e-mail não existe
// deixa o tempo de resposta parecido e não revela quais e-mails têm conta.
const HASH_FICTICIO = "$2b$10$eOQeDV88iRJPEulzCfYE8.yJ0iGyza2AlBAj4CPxijcMEhXDJBDFK";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(credenciais) {
        const dados = esquemaLogin.safeParse(credenciais);
        if (!dados.success) return null;

        const usuario = await db.usuario.findUnique({ where: { email: dados.data.email } });
        const senhaOk = await bcrypt.compare(dados.data.senha, usuario?.senhaHash ?? HASH_FICTICIO);
        if (!usuario || !senhaOk) return null;

        return { id: usuario.id, name: usuario.nome, email: usuario.email };
      },
    }),
  ],
});
