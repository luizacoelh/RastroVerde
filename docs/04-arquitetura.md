# 4. Arquitetura do Sistema — RastroVerde

Diagramas em Mermaid (renderizam direto no GitHub). Estilo inspirado no modelo **C4**.

## 4.1 Tecnologias

| Camada | Tecnologia | Por quê |
|---|---|---|
| Front-end + back-end | **Next.js 16** (App Router, Server Actions), TypeScript | Um projeto só, deploy simples na Vercel |
| UI | Tailwind CSS | Rapidez para montar telas |
| Mapa | **MapLibre GL JS** + **Terra Draw** | Mapas vetoriais open source; desenho de polígonos |
| Análise geoespacial | **Turf.js** | Interseção e área de polígonos em TypeScript, sem servidor GIS |
| Banco de dados | **PostgreSQL (Neon)** + Prisma ORM | Gratuito, serverless; geometria guardada como GeoJSON (JSONB) + bbox indexado |
| Autenticação | Auth.js (credenciais, JWT) | Padrão do ecossistema Next |
| IA | **Google Gemini** (API) | Resumo em linguagem simples; plano gratuito |
| PDF e QR | `@react-pdf/renderer`, `qrcode` | PDF gerado no servidor |
| Dados de referência | Recorte GeoJSON de **MapBiomas Alerta / PRODES** | Bases públicas oficiais de desmatamento |
| Qualidade | ESLint, Vitest, Playwright, GitHub Actions | Lint + testes no CI |
| Hospedagem | Vercel | Plano gratuito, HTTPS automático |

### Decisões de arquitetura (ADRs resumidos)

- **ADR-01 — Turf.js em vez de PostGIS no MVP.** A base de alertas é um recorte pequeno; filtrar por
  bbox no banco e calcular a interseção com Turf.js no servidor é suficiente e evita configurar
  extensões. *Evolução:* migrar para PostGIS se a base crescer.
- **ADR-02 — Monólito Next.js.** Duas pessoas e 4 semanas: um único deploy reduz complexidade.
- **ADR-03 — Base de alertas estática e versionada.** Importada por script (RF19); cada análise
  registra a versão (RNF11). Elimina dependência de APIs externas instáveis.
- **ADR-04 — IA opcional.** O resumo por IA nunca bloqueia o PDF (RNF10).

## 4.2 Diagrama de contexto

```mermaid
flowchart TB
  prod([Produtor / Técnico])
  comp([Comprador])
  adm([Administrador])
  sys[[RastroVerde]]
  gem[(Google Gemini API)]
  mb[(MapBiomas Alerta / PRODES<br/>arquivos públicos)]
  tiles[(Provedor de mapas base<br/>OpenStreetMap)]

  prod -- cadastra talhões, gera dossiê --> sys
  comp -- lê QR code e verifica --> sys
  adm -- importa recorte de alertas --> sys
  mb -. download manual .-> adm
  sys -- gera resumo --> gem
  sys -- carrega mapa --> tiles
```

## 4.3 Diagrama de componentes

```mermaid
flowchart LR
  subgraph Navegador
    UI[Páginas React<br/>Dashboard, Propriedades, Talhão, Resultado]
    MAP[Componente de Mapa<br/>MapLibre + Terra Draw]
  end

  subgraph "Servidor Next.js (Vercel)"
    AUTH[Auth.js<br/>login/sessão]
    ACT[Server Actions<br/>propriedades e talhões]
    GEO[Serviço de Análise<br/>Turf.js: validação, área, interseção, risco]
    DOS[Serviço de Dossiê<br/>PDF + QR + hash SHA-256]
    IA[Cliente Gemini<br/>resumo com fallback]
    VER[Rota pública<br/>/verificar/codigo]
    REPO[Prisma ORM]
  end

  DB[(PostgreSQL - Neon)]
  SCRIPT[Script de importação<br/>de alertas - CLI]
  GEM[(Gemini API)]

  UI --> AUTH
  UI --> ACT
  MAP --> ACT
  ACT --> GEO
  ACT --> DOS
  DOS --> IA --> GEM
  GEO --> REPO
  DOS --> REPO
  VER --> REPO
  ACT --> REPO
  REPO --> DB
  SCRIPT --> DB
```

## 4.4 Diagrama de implantação

```mermaid
flowchart TB
  subgraph Cliente
    BR[Navegador<br/>desktop ou celular]
  end
  subgraph "Vercel (região gru1 - São Paulo)"
    EDGE[CDN / HTTPS]
    FN[Funções Serverless Node.js<br/>Next.js 16]
  end
  subgraph "Neon (sa-east-1)"
    PG[(PostgreSQL 16)]
  end
  subgraph Google Cloud
    GM[Gemini API]
  end
  subgraph GitHub
    REPO[Repositório]
    CI[GitHub Actions<br/>lint + testes]
  end
  OSM[Tiles OpenStreetMap]

  BR -- HTTPS --> EDGE --> FN
  BR -- HTTPS --> OSM
  FN -- TLS / Prisma --> PG
  FN -- HTTPS --> GM
  REPO --> CI
  REPO -- deploy automático --> FN
```

## 4.5 Modelo de dados

```mermaid
erDiagram
  USUARIO ||--o{ PROPRIEDADE : possui
  PROPRIEDADE ||--o{ TALHAO : contem
  TALHAO ||--o{ ANALISE : tem
  ANALISE ||--o| DOSSIE : gera
  BASE_ALERTAS ||--o{ ALERTA : contem
  BASE_ALERTAS ||--o{ ANALISE : usada_em

  USUARIO {
    string id PK
    string nome
    string email UK
    string senhaHash
  }
  PROPRIEDADE {
    string id PK
    string usuarioId FK
    string nome
    string municipio
    string uf
    string cultura
    string car
  }
  TALHAO {
    string id PK
    string propriedadeId FK
    string nome
    json geometria
    float areaHa
    json bbox
  }
  ALERTA {
    string id PK
    string baseId FK
    json geometria
    date dataDeteccao
    json bbox
  }
  BASE_ALERTAS {
    string id PK
    string fonte
    string versao
    datetime importadaEm
  }
  ANALISE {
    string id PK
    string talhaoId FK
    string baseId FK
    float areaSobrepostaHa
    float percentual
    string risco
    json sobreposicao
    datetime criadaEm
  }
  DOSSIE {
    string id PK
    string analiseId FK
    string codigo UK
    string hash
    string resumoIA
    datetime emitidoEm
  }
```

## 4.6 Sequência — análise e dossiê

```mermaid
sequenceDiagram
  actor P as Produtor
  participant UI as Tela do Talhão
  participant SA as Server Action
  participant GEO as Serviço de Análise
  participant DB as PostgreSQL
  participant DOS as Serviço de Dossiê
  participant G as Gemini

  P->>UI: Clica "Analisar"
  UI->>SA: analisarTalhao(id)
  SA->>DB: busca talhão (verifica dono)
  SA->>DB: alertas com bbox que cruza e data > 2020-12-31
  SA->>GEO: interseção + área + risco
  GEO-->>SA: resultado
  SA->>DB: salva ANALISE
  SA-->>UI: risco + polígonos sobrepostos
  P->>UI: Clica "Gerar dossiê"
  UI->>DOS: gerarDossie(analiseId)
  DOS->>G: pede resumo (timeout 8 s)
  G-->>DOS: texto (ou falha → texto padrão)
  DOS->>DOS: monta PDF, QR, hash SHA-256
  DOS->>DB: salva DOSSIE
  DOS-->>P: download do PDF
```

## 4.7 Coerência com os requisitos

| Requisito | Componente responsável |
|---|---|
| RF01–RF02, RNF03 | Auth.js |
| RF03–RF08, RF20 | Server Actions + Componente de Mapa |
| RF09–RF13, RNF01, RNF11 | Serviço de Análise (Turf.js) + BASE_ALERTAS versionada |
| RF14–RF17, RNF10 | Serviço de Dossiê + Cliente Gemini com fallback |
| RF18, RNF06 | Rota pública `/verificar` (só dados não pessoais) |
| RF19 | Script de importação |
| RNF05, RNF13 | Vercel (HTTPS) + Neon |
