// Importa uma base de alertas de desmatamento (recorte GeoJSON) — US13, RF19, ADR-03.
//
// Uso:
//   npm run alertas:importar -- --arquivo alertas.geojson --cobertura municipio1.geojson [--cobertura municipio2.geojson] \
//     --fonte "PRODES Cerrado (INPE)" --versao 2026-10-16 --campo-data image_date --campo-codigo uuid
//
// Cada (fonte, versão) é importada uma única vez e não muda depois (RNF11: as análises
// guardam a versão usada). Para atualizar os dados, importe uma versão nova.
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { prepararAlertas, prepararCobertura, type Descarte } from "../src/lib/alertas/importacao";
import { DATA_CORTE_EUDR } from "../src/lib/geo/analise";

const AJUDA = `Importa uma base de alertas de desmatamento (GeoJSON em WGS 84).

Obrigatórios:
  --arquivo <caminho>     GeoJSON com os polígonos dos alertas
  --cobertura <caminho>   GeoJSON com a área coberta pelo recorte (ex.: limite do município);
                          repita a opção para vários municípios
  --fonte <texto>         Ex.: "PRODES Cerrado (INPE)"
  --versao <texto>        Ex.: 2026-11

Opcionais:
  --campo-data <nome>     Propriedade com a data de detecção (padrão: DATADETEC, do MapBiomas;
                          PRODES: image_date)
  --campo-codigo <nome>   Propriedade com o código do alerta (padrão: CODEALERTA; PRODES: uuid)
  --simular               Só valida e mostra o resumo, sem gravar no banco
  --pular-se-existir      Termina sem erro se a fonte/versão já foi importada
`;

const TAMANHO_LOTE = 1000;

function resumirDescartes(descartados: Descarte[]) {
  const porMotivo = new Map<string, number>();
  for (const d of descartados) porMotivo.set(d.motivo, (porMotivo.get(d.motivo) ?? 0) + 1);
  for (const [motivo, qtd] of porMotivo) console.log(`  - ${qtd} × ${motivo}`);
}

async function lerJson(caminho: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(caminho, "utf-8"));
  } catch (erro) {
    throw new Error(`Não foi possível ler ${caminho}: ${(erro as Error).message}`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      arquivo: { type: "string" },
      cobertura: { type: "string", multiple: true },
      fonte: { type: "string" },
      versao: { type: "string" },
      "campo-data": { type: "string", default: "DATADETEC" },
      "campo-codigo": { type: "string", default: "CODEALERTA" },
      simular: { type: "boolean", default: false },
      "pular-se-existir": { type: "boolean", default: false },
      ajuda: { type: "boolean", short: "h", default: false },
    },
  });

  const fonte = values.fonte?.trim();
  const versao = values.versao?.trim();
  if (values.ajuda || !values.arquivo || !values.cobertura?.length || !fonte || !versao) {
    console.log(AJUDA);
    process.exit(values.ajuda ? 0 : 1);
  }

  // Junta as feições de todos os arquivos de cobertura num só FeatureCollection.
  const feicoesCobertura: unknown[] = [];
  for (const caminho of values.cobertura) {
    const lido = (await lerJson(caminho)) as { type?: string; features?: unknown[] };
    feicoesCobertura.push(...(lido?.type === "FeatureCollection" && Array.isArray(lido.features) ? lido.features : [lido]));
  }
  const cobertura = prepararCobertura({ type: "FeatureCollection", features: feicoesCobertura });
  if (typeof cobertura === "string") throw new Error(cobertura);

  const preparados = prepararAlertas(await lerJson(values.arquivo), {
    campoData: values["campo-data"]!,
    campoCodigo: values["campo-codigo"],
  });
  if (typeof preparados === "string") throw new Error(preparados);
  const { alertas, descartados, reparados } = preparados;

  const posCorte = alertas.filter((a) => a.dataDeteccao > DATA_CORTE_EUDR).length;
  const [cMinLng, cMinLat, cMaxLng, cMaxLat] = cobertura.bbox;
  const foraDaCobertura = alertas.filter(
    ({ bbox: [minLng, minLat, maxLng, maxLat] }) =>
      maxLng < cMinLng || minLng > cMaxLng || maxLat < cMinLat || minLat > cMaxLat,
  ).length;

  console.log(`Base: ${fonte} ${versao}`);
  console.log(`Alertas válidos: ${alertas.length} (${posCorte} detectados após 31/12/2020)`);
  if (reparados) console.log(`Reparados (auto-interseção ou anéis que se tocam): ${reparados}`);
  if (descartados.length) {
    console.log(`Descartados: ${descartados.length}`);
    resumirDescartes(descartados);
  }
  if (foraDaCobertura) {
    console.log(`Aviso: ${foraDaCobertura} alerta(s) ficam fora do retângulo da cobertura. Confira o recorte.`);
  }
  if (alertas.length === 0) console.log("Aviso: nenhum alerta válido; a base registrará a região como sem desmatamento.");

  if (values.simular) {
    console.log("Simulação: nada foi gravado.");
    return;
  }

  // Migrações e scripts usam a conexão de sessão (DIRECT_URL), como o Prisma CLI.
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DIRECT_URL ou DATABASE_URL.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const existente = await db.baseAlertas.findUnique({ where: { fonte_versao: { fonte, versao } } });
    if (existente) {
      const mensagem = `A base ${fonte} ${versao} já foi importada em ${existente.importadaEm.toISOString()}.`;
      if (values["pular-se-existir"]) {
        console.log(`${mensagem} Nada a fazer.`);
        return;
      }
      throw new Error(`${mensagem} Use uma versão nova.`);
    }

    const base = await db.$transaction(
      async (tx) => {
        const [minLng, minLat, maxLng, maxLat] = cobertura.bbox;
        const criada = await tx.baseAlertas.create({
          data: {
            fonte,
            versao,
            cobertura: cobertura.geometria as unknown as Prisma.InputJsonObject,
            bboxMinLng: minLng,
            bboxMinLat: minLat,
            bboxMaxLng: maxLng,
            bboxMaxLat: maxLat,
          },
        });
        for (let i = 0; i < alertas.length; i += TAMANHO_LOTE) {
          await tx.alerta.createMany({
            data: alertas.slice(i, i + TAMANHO_LOTE).map((a) => ({
              baseId: criada.id,
              codigoFonte: a.codigoFonte,
              geometria: a.geometria as unknown as Prisma.InputJsonObject,
              dataDeteccao: a.dataDeteccao,
              bboxMinLng: a.bbox[0],
              bboxMinLat: a.bbox[1],
              bboxMaxLng: a.bbox[2],
              bboxMaxLat: a.bbox[3],
            })),
          });
          if (alertas.length > TAMANHO_LOTE) {
            console.log(`  ${Math.min(i + TAMANHO_LOTE, alertas.length)}/${alertas.length}`);
          }
        }
        return criada;
      },
      { timeout: 10 * 60_000, maxWait: 30_000 },
    );
    console.log(`Importada: ${alertas.length} alertas (base ${base.id}).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((erro: unknown) => {
  console.error(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
