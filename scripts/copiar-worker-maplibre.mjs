// Copia o worker do MapLibre GL para public/ (ver URL_WORKER_MAPLIBRE em src/components/mapa/base.ts).
// Roda antes do dev e do build, então a cópia sempre corresponde à versão instalada.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const origem = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "maplibre", "maplibre-gl-worker.mjs");

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origem, destino);
