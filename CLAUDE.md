# RastroVerde — guia para o Claude Code

Dossiê de conformidade EUDR: talhão (polígono) × alertas de desmatamento pós-31/12/2020 → risco → PDF com QR code.
Documentação em `docs/` (visão, backlog, SRS, arquitetura, protótipo, plano). Comunicação em português, direta.

## Escopo (regra principal)
- Implementar só o MVP descrito em `docs/01-visao.md` §6 e as histórias US01–US13 de `docs/02-backlog.md`.
- Itens de "Evoluções futuras" (CAR/SICAR, satélite, app mobile, TRACES, etc.) NÃO entram sem pedido explícito.
- Base de alertas: recorte GeoJSON estático, importado por script, versionado.

## Stack
Next.js 16 (App Router; ler `node_modules/next/dist/docs/` antes de usar API nova), TypeScript estrito, Tailwind,
MapLibre GL + Terra Draw, Turf.js, PostgreSQL (Neon) + Prisma, Auth.js, Gemini (opcional, com fallback), Vercel.

## Regras
- Git: nunca commitar na `main`; branches `feat/*`, `fix/*`, `docs/*`; Conventional Commits; PR com revisão.
- Commits sem linhas de coautoria/atribuição a IA.
- Nunca commitar `.env*` nem segredos. Chaves só no servidor.
- Todo acesso a dados verifica o dono (RF20).
- Antes de dar algo como pronto: `npm run lint`, `npm test`, `npm run build`.
- Mudança relevante atualiza o doc correspondente em `docs/`.
