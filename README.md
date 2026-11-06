# RastroVerde

Dossiê de conformidade socioambiental para exportação agrícola (EUDR — Regulamento (UE) 2023/1115).

O produtor cadastra o talhão, o sistema cruza o polígono com alertas de desmatamento posteriores a
31/12/2020 e gera um dossiê em PDF com QR code verificável pelo comprador.

> Status: **Sprint 3** — dossiê PDF com QR code, resumo por IA e verificação pública.

## Como rodar

Requisitos: Node.js 22.12+ e um projeto no [Supabase](https://supabase.com) (plano gratuito).

```bash
npm install                # também gera o Prisma Client
cp .env.example .env       # preencha DATABASE_URL, DIRECT_URL e AUTH_SECRET (APP_URL e GEMINI_* são opcionais)
npm run db:deploy          # aplica as migrações no banco
npm run dev                # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Tipos de rota do Next + `tsc` |
| `npm test` / `npm run test:coverage` | Vitest (cobertura mínima de 70% em `src/lib/geo`) |
| `npm run test:e2e` | Playwright: desenho e importação de talhão, análise, dossiê, verificação pública, RN03 e RN04 |
| `npm run build` | Build de produção |
| `npm run alertas:importar` | Importa uma base de alertas de desmatamento (veja abaixo) |
| `npm run db:migrate` | Cria uma nova migração a partir do `prisma/schema.prisma` (desenvolvimento) |

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build em todo PR.

`npm run dev` e `npm run build` copiam o worker do MapLibre para `public/maplibre/` (o Turbopack não
publica o arquivo que o MapLibre 6 procura ao lado do próprio bundle).

### Base de alertas (US13)

A análise precisa de uma base importada; sem ela todo talhão dá "região sem dados". Cada importação
é uma **versão** imutável (as análises guardam a versão usada).

Fonte usada: **PRODES Cerrado** (INPE), desmatamento anual. O download do MapBiomas Alerta
estava fora do ar (AccessDenied) em 05/11/2026. Os arquivos brutos ficam em `dados/`, que não vai
para o Git.

1. **Alertas** — no [TerraBrasilis](https://terrabrasilis.dpi.inpe.br/downloads/), baixe
   *Cerrado → Yearly deforestation* (shapefile, SIRGAS 2000, ~800 MB zipado) e descompacte em
   `dados/prodes/`. Campos usados: `image_date` (data da imagem em que o desmatamento foi
   mapeado), `year` (ano PRODES), `uuid` (identificador) e `main_class` (todas as feições do
   recorte são `DESMATAMENTO`).
2. **Cobertura** — limites dos municípios na API de malhas do IBGE (Luís Eduardo Magalhães/BA =
   2919553, São Desidério/BA = 2928901). Eles recortam os alertas e viram a área de cobertura da base:
   ```bash
   mkdir -p dados/ibge
   for c in 2919553 2928901; do
     curl -fo dados/ibge/$c.geojson "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/$c?formato=application/vnd.geo+json&qualidade=maxima"
   done
   ```
3. **Recorte** — o shapefile tem 2,4 milhões de polígonos. Primeiro um pré-filtro em streaming
   pelo retângulo dos municípios (~6 min), depois o recorte exato com o mapshaper. O `-clean`
   repara geometrias, e o importador também repara as que ainda tiverem auto-interseção, em vez
   de descartar alertas:
   ```bash
   node scripts/prefiltrar-shapefile.mjs dados/prodes/yearly_deforestation_biome_cerrado_v20261016.shp \
     dados/prodes-candidatos.geojson dados/ibge/2919553.geojson dados/ibge/2928901.geojson
   npx mapshaper -i dados/ibge/2919553.geojson dados/ibge/2928901.geojson combine-files -merge-layers \
     -o dados/cobertura-lem-sao-desiderio.geojson
   npx mapshaper -i dados/prodes-candidatos.geojson -clip dados/cobertura-lem-sao-desiderio.geojson \
     -clean allow-overlaps -filter-fields uuid,image_date,year,class_name,area_km \
     -o dados/prodes-cerrado-lem-sao-desiderio.geojson precision=0.0000001
   ```
   SIRGAS 2000 e WGS 84 coincidem na prática (diferença de centímetros), então não há reprojeção.
4. **Importação** — use `--simular` antes para só validar. A versão é a data de publicação do arquivo:
   ```bash
   npm run alertas:importar -- --arquivo dados/prodes-cerrado-lem-sao-desiderio.geojson \
     --cobertura dados/ibge/2919553.geojson --cobertura dados/ibge/2928901.geojson \
     --fonte "PRODES Cerrado (INPE)" --versao 2026-10-16 --campo-data image_date --campo-codigo uuid
   ```

**Data de corte com o PRODES.** O ano PRODES Y cobre o desmatamento entre as imagens de meados
de Y−1 e as de meados de Y (aproximadamente agosto a julho). No recorte, as imagens do ano Y são
sempre de junho a dezembro de Y, então `image_date > 31/12/2020` equivale a `year ≥ 2021`. O
PRODES 2021 inclui desmatamento feito entre ~agosto e dezembro de 2020, antes do corte. Mesmo
assim ele **conta**, porque o arquivo não diz em que mês o corte ocorreu. É a opção conservadora:
pode gerar falso alarme, mas não esconde desmatamento de 2021. O PRODES 2020 e anteriores
(imagens até agosto de 2020) não contam.

O importador lê por padrão os campos `DATADETEC`/`CODEALERTA` (formato do MapBiomas Alerta);
para outras fontes, passe `--campo-data` e `--campo-codigo`.

Para desenvolvimento há uma base **fictícia** em `e2e/fixtures/` (a mesma do E2E). Não a importe
no banco de produção: ela cobre uma região real e geraria resultados falsos.

### Dossiê e resumo por IA (US10–US12)

Na tela de resultado, **Gerar dossiê PDF** emite o dossiê da análise atual. O PDF fica guardado
e não muda depois de emitido. O QR code aponta para `/verificar/{codigo}`, página pública que mostra
o risco e o hash SHA-256 do PDF e permite ao comprador conferir o arquivo no próprio navegador.

| Variável | Para quê |
|---|---|
| `APP_URL` | Endereço público gravado no QR code (em produção, a URL da Vercel). Vazio: usa o endereço da requisição. |
| `GEMINI_API_KEY` | Opcional. Chave do [Google AI Studio](https://aistudio.google.com/apikey) para o resumo em linguagem simples. Sem ela, o dossiê usa o texto padrão. |
| `GEMINI_MODEL` | Opcional. Padrão: `gemini-flash-latest`. |

A chave fica só no servidor (`.env` local e variáveis de ambiente da Vercel), nunca no Git.

### Testes E2E

Precisam de um banco **de teste** com as migrações aplicadas (nunca o de produção). Exemplo local:

```bash
npx playwright install chromium     # uma vez
npx prisma dev -d -n rastroverde-e2e   # Postgres local; copie a URL TCP exibida
DATABASE_URL="<url>" DIRECT_URL="<url>" npm run db:deploy
DATABASE_URL="<url>" npm run test:e2e
```

O setup do E2E importa a base fictícia e só aceita banco local. O Playwright sobe um `next dev` próprio na porta 3100 (pasta `.next-e2e`), então funciona mesmo
com o seu `npm run dev` aberto.

## Equipe

| Integrante | Papel | Foco técnico |
|---|---|---|
| Luiza Coelho | Product Owner + Dev | Back-end, análise geoespacial, deploy |
| Lucas | Scrum Master + Dev | Front-end (mapa e telas), testes |

## Documentação

| # | Documento | Arquivo |
|---|---|---|
| 1 | Visão do Produto | [docs/01-visao.md](docs/01-visao.md) |
| 2 | Backlog do Produto | [docs/02-backlog.md](docs/02-backlog.md) |
| 3 | Especificação de Requisitos (SRS) | [docs/03-srs.md](docs/03-srs.md) |
| 4 | Arquitetura | [docs/04-arquitetura.md](docs/04-arquitetura.md) |
| 5 | Protótipo de Interface | [docs/05-prototipo.md](docs/05-prototipo.md) |
| 6 | Plano de Projeto | [docs/06-plano-projeto.md](docs/06-plano-projeto.md) |

Escopo do MVP e evoluções futuras: [docs/01-visao.md](docs/01-visao.md#6-escopo-do-mvp).

## Stack

Next.js 16 · TypeScript · Tailwind · MapLibre GL + Terra Draw · Turf.js · PostgreSQL (Supabase) + Prisma ·
Auth.js · Google Gemini · Vercel.
