import { defineConfig, devices } from "@playwright/test";

// Testes E2E (docs/06-plano-projeto.md). Precisam de um banco com as migrações aplicadas:
// use DATABASE_URL apontando para um Postgres de teste, nunca o de produção.
const PORTA = Number(process.env.E2E_PORTA ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
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
    env: { NEXT_DIST_DIR: ".next-e2e" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
