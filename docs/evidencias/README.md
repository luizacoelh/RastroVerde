# Evidências de teste

Arquivos citados no [Plano e Relatório de Testes](../07-plano-e-relatorio-de-testes.md). Todos
foram gerados em 06/11/2026 a partir da `main` em `0909469`.

| Arquivo | O que é |
|---|---|
| `testes-unitarios.txt` | Saída de `npm run test:coverage` (132 testes e a tabela de cobertura) |
| `testes-unitarios-lista.txt` | Saída de `vitest --reporter=verbose`: cada teste unitário pelo nome |
| `testes-e2e.txt` | Saída de `npm run test:e2e` (5 testes Playwright, banco local com a base fictícia) |
| `lint-typecheck-build.txt` | Saída de `npm run lint`, `npm run typecheck` e `npm run build` |
| `ci-execucoes.txt` | Execuções do workflow CI no GitHub Actions, consultadas pela API do GitHub |
| `e2e/` | Capturas feitas pelos testes E2E (conta "Teste E2E", banco local, base fictícia) |
| `producao/` | Capturas de https://rastroverde.vercel.app (base PRODES real) |

## Capturas de produção

- **Sem login** (navegador headless): `01-cadastro`, `02-login`, `20-verificar-codigo`, `21-verificacao-autentico`, `22-verificacao-nao-encontrado` e `23-verificacao-celular-360px` (360 px de largura).
- **Com login**, na sessão de uma conta de teste: os demais arquivos. O **nome da conta no cabeçalho foi ocultado** por CSS antes de cada captura, por privacidade; nada mais foi alterado. Só aparecem a "Fazenda Teste Produção" e os talhões de teste.
- `dossie-RV-2026-7VATD6.pdf` é o PDF emitido em produção, baixado pelo botão **Baixar dossiê PDF**. O SHA-256 dele é o mesmo da página de verificação. `25-dossie-pdf-pagina1.png` é a imagem da página.
- Em `07-editar-talhao.jpg` aparece o defeito 7 do relatório: o talhão editado fica pequeno porque o mapa enquadra os dois pivôs.
