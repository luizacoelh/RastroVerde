import { defineConfig, devices } from "@playwright/test";

// Testes E2E (docs/06-plano-projeto.md). Precisam de um Postgres LOCAL de teste com as
// migrações aplicadas (DATABASE_URL); o setup global recusa bancos remotos.
const PORTA = Number(process.env.E2E_PORTA ?? 3100);

export default defineConfig({
  testDir: "e2e",
  // Importa a base de alertas fictícia (só em banco local).
  globalSetup: "./e2e/preparar-banco.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npm run dev -- --port ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    // Dev server (Strict Mode ligado) em pasta própria, para não conflitar com o `npm run dev`.
    // Sem chave do Gemini: o dossiê usa o texto padrão (RNF10) e o teste não depende da rede.
    env: { NEXT_DIST_DIR: ".next-e2e", GEMINI_API_KEY: "", APP_URL: "" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
