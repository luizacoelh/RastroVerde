import type { NextConfig } from "next";

// cacheComponents desligado no MVP: todas as telas dependem da sessão do usuário,
// então usamos o modelo de renderização dinâmica (ver docs/04-arquitetura.md, ADR-06).
const nextConfig: NextConfig = {
  // Os testes E2E sobem um dev server separado (.next-e2e) sem conflitar com o `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
