// Setup global do E2E: importa a base de alertas FICTÍCIA de e2e/fixtures no banco de teste.
import { execFileSync } from "node:child_process";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..");

export default function prepararBanco() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.match(/@([^:/?]+)/)?.[1] ?? "";
  // A base fictícia cobre uma região real (oeste da Bahia); num banco compartilhado ela
  // entraria nas análises de verdade. Só roda em banco local, salvo liberação explícita.
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host) && process.env.E2E_PERMITIR_BANCO_REMOTO !== "1") {
    throw new Error(
      `E2E recusado: DATABASE_URL aponta para "${host || "(vazio)"}". Use um Postgres local de teste (veja o README).`,
    );
  }

  execFileSync(
    process.execPath,
    [
      path.join(RAIZ, "node_modules", "tsx", "dist", "cli.mjs"),
      path.join(RAIZ, "scripts", "importar-alertas.ts"),
      "--arquivo",
      path.join(RAIZ, "e2e", "fixtures", "alertas-teste.geojson"),
      "--cobertura",
      path.join(RAIZ, "e2e", "fixtures", "cobertura-teste.geojson"),
      "--fonte",
      "Dados fictícios (teste)",
      "--versao",
      "e2e-1",
      "--descricao-cobertura",
      "a área de teste fictícia (BA)",
      "--pular-se-existir",
    ],
    { cwd: RAIZ, stdio: "inherit", env: { ...process.env, DIRECT_URL: url } },
  );
}
