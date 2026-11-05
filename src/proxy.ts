import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Redireciona visitantes sem sessão para /login (checagem otimista; ver src/lib/dal.ts).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|maplibre/|_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|svg|ico|webp)$).*)"],
};
