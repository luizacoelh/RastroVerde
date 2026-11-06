// Importa o limite de um município (malha do IBGE) — usado para conferir se o talhão está no
// município declarado na propriedade (defeito 8).
//
// Uso:
//   npm run municipios:importar -- --arquivo dados/ibge/2919553.geojson --nome "Luís Eduardo Magalhães" --uf BA
//
// O código IBGE vem de --codigo ou da propriedade "codarea" do arquivo da API de malhas do IBGE.
// Importar de novo o mesmo código atualiza nome, UF e limite (é dado de referência, não histórico).
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { prepararCobertura } from "../src/lib/alertas/importacao";
import { calcularAreaHa } from "../src/lib/geo/talhao";

const AJUDA = `Importa o limite de um município (GeoJSON da API de malhas do IBGE, WGS 84).

Obrigatórios:
  --arquivo <caminho>   GeoJSON com o limite (ex.: dados/ibge/2919553.geojson)
  --nome <texto>        Nome oficial, com acentos (ex.: "Luís Eduardo Magalhães")
  --uf <sigla>          Ex.: BA

Opcionais:
  --codigo <7 dígitos>  Código IBGE; padrão: a propriedade "codarea" do arquivo
  --simular             Só valida e mostra o resumo, sem gravar no banco
`;

async function main() {
  const { values } = parseArgs({
    options: {
      arquivo: { type: "string" },
      nome: { type: "string" },
      uf: { type: "string" },
      codigo: { type: "string" },
      simular: { type: "boolean", default: false },
      ajuda: { type: "boolean", short: "h", default: false },
    },
  });
  const nome = values.nome?.trim();
  const uf = values.uf?.trim().toUpperCase();
  if (values.ajuda || !values.arquivo || !nome || !uf) {
    console.log(AJUDA);
    process.exit(values.ajuda ? 0 : 1);
  }
  if (!/^[A-Z]{2}$/.test(uf)) throw new Error(`UF inválida: ${uf}`);

  const entrada = JSON.parse(await readFile(values.arquivo, "utf-8")) as {
    features?: { properties?: { codarea?: unknown } }[];
  };
  const codigo = (values.codigo ?? String(entrada.features?.[0]?.properties?.codarea ?? "")).trim();
  if (!/^\d{7}$/.test(codigo)) throw new Error("Código IBGE ausente ou inválido: use --codigo com 7 dígitos.");

  const limite = prepararCobertura(entrada);
  if (typeof limite === "string") throw new Error(limite);
  const [minLng, minLat, maxLng, maxLat] = limite.bbox;
  console.log(`Município: ${nome}/${uf} (IBGE ${codigo}), ${Math.round(calcularAreaHa(limite.geometria) / 100)} km²`);

  if (values.simular) {
    console.log("Simulação: nada foi gravado.");
    return;
  }

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DIRECT_URL ou DATABASE_URL.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const dados = {
      nome,
      uf,
      geometria: limite.geometria as unknown as Prisma.InputJsonObject,
      bboxMinLng: minLng,
      bboxMinLat: minLat,
      bboxMaxLng: maxLng,
      bboxMaxLat: maxLat,
    };
    const existia = await db.municipio.findUnique({ where: { codigoIbge: codigo }, select: { codigoIbge: true } });
    await db.municipio.upsert({ where: { codigoIbge: codigo }, create: { codigoIbge: codigo, ...dados }, update: dados });
    console.log(existia ? "Atualizado." : "Importado.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((erro: unknown) => {
  console.error(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
