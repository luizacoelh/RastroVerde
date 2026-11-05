// Pré-filtro de shapefiles grandes (ex.: PRODES Cerrado, 2,4 milhões de polígonos): lê em
// streaming e grava em GeoJSON só as feições cujo retângulo cruza o dos limites informados.
// O recorte exato vem depois, com o mapshaper (veja o README, "Base de alertas").
//
// Uso: node scripts/prefiltrar-shapefile.mjs <entrada.shp> <saida.geojson> <limite.geojson> [...]
import { createWriteStream, readFileSync } from "node:fs";
import { open } from "shapefile";

const [, , shp, saida, ...limites] = process.argv;
if (!shp || !saida || limites.length === 0) {
  console.error("Uso: node scripts/prefiltrar-shapefile.mjs <entrada.shp> <saida.geojson> <limite.geojson> [...]");
  process.exit(1);
}

function percorrer(coords, f) {
  if (typeof coords[0] === "number") f(coords);
  else for (const c of coords) percorrer(c, f);
}

function retangulo(geometrias) {
  const r = [Infinity, Infinity, -Infinity, -Infinity];
  for (const g of geometrias) {
    percorrer(g.coordinates, ([x, y]) => {
      if (x < r[0]) r[0] = x;
      if (y < r[1]) r[1] = y;
      if (x > r[2]) r[2] = x;
      if (y > r[3]) r[3] = y;
    });
  }
  return r;
}

const caixa = retangulo(
  limites.flatMap((arquivo) => {
    const g = JSON.parse(readFileSync(arquivo, "utf8"));
    return (g.features ?? [g]).map((f) => f.geometry ?? f);
  }),
);
console.log(`Retângulo dos limites: ${caixa.map((v) => v.toFixed(4)).join(", ")}`);

// DBF do INPE em Latin-1; datas (tipo D) viram AAAA-MM-DD.
const fonte = await open(shp, shp.replace(/\.shp$/i, ".dbf"), { encoding: "windows-1252" });
const out = createWriteStream(saida);
out.write('{"type":"FeatureCollection","features":[\n');
let lidos = 0;
let guardados = 0;
for (;;) {
  const { done, value } = await fonte.read();
  if (done) break;
  if (++lidos % 200_000 === 0) console.log(`  ${lidos} lidos, ${guardados} guardados`);
  if (!value.geometry) continue;
  const [x0, y0, x1, y1] = retangulo([value.geometry]);
  if (x1 < caixa[0] || x0 > caixa[2] || y1 < caixa[1] || y0 > caixa[3]) continue;
  const propriedades = Object.fromEntries(
    Object.entries(value.properties).map(([k, v]) => [k, v instanceof Date ? v.toISOString().slice(0, 10) : v]),
  );
  out.write((guardados++ ? ",\n" : "") + JSON.stringify({ type: "Feature", properties: propriedades, geometry: value.geometry }));
}
out.end("\n]}\n");
console.log(`Fim: ${lidos} lidos, ${guardados} guardados em ${saida}`);
