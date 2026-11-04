# RastroVerde

Dossiê de conformidade socioambiental para exportação agrícola (EUDR — Regulamento (UE) 2023/1115).

O produtor cadastra o talhão, o sistema cruza o polígono com alertas de desmatamento posteriores a
31/12/2020 e gera um dossiê em PDF com QR code verificável pelo comprador.

> Status: **documentação e planejamento concluídos** · MVP em desenvolvimento.

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

Next.js 16 · TypeScript · Tailwind · MapLibre GL + Terra Draw · Turf.js · PostgreSQL (Neon) + Prisma ·
Auth.js · Google Gemini · Vercel.
