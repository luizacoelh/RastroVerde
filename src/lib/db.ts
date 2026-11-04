import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Uma instância por processo; em desenvolvimento o hot reload recriaria o cliente a cada
// alteração, então reaproveitamos a instância guardada em globalThis.
// A conexão só é aberta na primeira consulta, então o build funciona sem DATABASE_URL.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
