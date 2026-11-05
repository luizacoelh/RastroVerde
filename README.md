# RastroVerde

Dossiê de conformidade socioambiental para exportação agrícola (EUDR — Regulamento (UE) 2023/1115).

O produtor cadastra o talhão, o sistema cruza o polígono com alertas de desmatamento posteriores a
31/12/2020 e gera um dossiê em PDF com QR code verificável pelo comprador.

> Status: **Sprint 1 em andamento** — acesso, propriedades e desenho de talhões.

## Como rodar

Requisitos: Node.js 22.12+ e um projeto no [Supabase](https://supabase.com) (plano gratuito).

```bash
npm install                # também gera o Prisma Client
cp .env.example .env       # preencha DATABASE_URL, DIRECT_URL e AUTH_SECRET
npm run db:deploy          # aplica as migrações no banco
npm run dev                # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Tipos de rota do Next + `tsc` |
| `npm test` / `npm run test:coverage` | Vitest (cobertura mínima de 70% em `src/lib/geo`) |
| `npm run test:e2e` | Playwright: cadastro → propriedade → desenho de um talhão de ~5 ha no mapa |
| `npm run build` | Build de produção |
| `npm run alertas:importar` | Importa uma base de alertas de desmatamento (veja abaixo) |
| `npm run db:migrate` | Cria uma nova migração a partir do `prisma/schema.prisma` (desenvolvimento) |

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build em todo PR.

`npm run dev` e `npm run build` copiam o worker do MapLibre para `public/maplibre/` (o Turbopack não
publica o arquivo que o MapLibre 6 procura ao lado do próprio bundle).

### Base de alertas (US13)

A análise precisa de uma base importada; sem ela todo talhão dá "região sem dados". Cada importação
é uma **versão** imutável (as análises guardam a versão usada).

1. **Alertas** — [MapBiomas Alerta](https://plataforma.alerta.mapbiomas.org), área de downloads
   (cadastro gratuito): baixe os alertas do estado (ex.: BA). Recorte para os municípios e converta
   para GeoJSON em WGS 84, por exemplo com `ogr2ogr` (GDAL) ou no [mapshaper.org](https://mapshaper.org):
   ```bash
   ogr2ogr -f GeoJSON -t_srs EPSG:4326 -clipsrc municipios.geojson alertas.geojson alertas_ba.shp
   ```
   O script lê a data em `DATADETEC` e o código em `CODEALERTA`; se o arquivo usar outros nomes,
   passe `--campo-data` e `--campo-codigo`.
2. **Cobertura** — limites dos municípios do recorte, pela API de malhas do IBGE
   (ex.: Luís Eduardo Magalhães/BA = 2919553, São Desidério/BA = 2928901):
   `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/2919553?formato=application/vnd.geo+json&qualidade=maxima`
3. Importe (use `--simular` antes para só validar):
   ```bash
   npm run alertas:importar -- --arquivo alertas.geojson \
     --cobertura lem.geojson --cobertura sao-desiderio.geojson \
     --fonte "MapBiomas Alerta" --versao 2026-11
   ```

Para desenvolvimento há uma base **fictícia** em `e2e/fixtures/` (a mesma do E2E). Não a importe
no banco de produção: ela cobre uma região real e geraria resultados falsos.

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
