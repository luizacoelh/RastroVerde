import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" lança erro fora do bundler do Next; nos testes vira módulo vazio.
      "server-only": path.resolve(import.meta.dirname, "test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db.ts", "src/generated/**"],
      // RNF12: cobertura ≥ 70% no módulo de análise geoespacial
      thresholds: {
        "src/lib/geo/**": { lines: 70, functions: 70, branches: 70, statements: 70 },
      },
    },
  },
});
