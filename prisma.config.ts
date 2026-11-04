import "dotenv/config";
import { defineConfig } from "prisma/config";

// Supabase: migrações usam a conexão direta (porta 5432); a aplicação usa o pooler
// (DATABASE_URL, porta 6543) via src/lib/db.ts. Ver docs/04-arquitetura.md, ADR-05.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
