import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Redireciona visitantes sem sessão para /login (checagem otimista; ver src/lib/dal.ts).
export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|svg|ico|webp)$).*)"],
};
