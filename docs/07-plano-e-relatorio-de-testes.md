# 7. Plano e Relatório de Testes — RastroVerde

| Item | Valor |
|---|---|
| Versão | 1.1 — 06/11/2026 (E2E-06, leitura do QR code com o celular e defeito 8) |
| Versão testada | Unitários, lint e build: `main` em `0909469` (merge do PR #7). E2E: branch do PR #9 em `dc9b9b5` (`main` + correção do defeito 7) |
| Produção | https://rastroverde.vercel.app (Vercel, funções em `pdx1`; Supabase `us-west-2`) |
| Evidências | [`docs/evidencias/`](evidencias/) |

Este documento junta o **plano** (o que testar, como e com que critério) e o **relatório** (o que
foi executado e o resultado). Só aparece aqui o que foi executado de fato. Onde um requisito não
tem teste automatizado, isso está dito explicitamente.

## 1. Estratégia

| Nível | Ferramenta | O que cobre | Onde roda |
|---|---|---|---|
| Unitário | Vitest 5 | Regras puras: validação do polígono, área, interseção, risco, importação da base, resumo por IA (com a API simulada), código, hash, mapa e QR do dossiê, geração do PDF | Local e no CI, em todo PR e push na `main` |
| Ponta a ponta (E2E) | Playwright 1.64 (Chromium) | Fluxos no navegador real, com um servidor Next próprio e um Postgres **local** com a base de alertas **fictícia** de `e2e/fixtures/` | Local (precisa de banco; não roda no CI) |
| Estático | ESLint, TypeScript (`tsc`), `next build`, `prisma validate` | Erros de tipo, lint e build | Local e no CI |
| Manual em produção | Chrome (sessão de uma conta de teste) + navegador headless para páginas públicas | Fluxo completo na URL pública com a base real (PRODES Cerrado) | https://rastroverde.vercel.app |

**Critério de aprovação (DoD, [backlog](02-backlog.md#definição-de-pronto-dod)):** lint, typecheck,
testes unitários e build sem erro; cobertura ≥ 70% em `src/lib/geo` (RNF12); E2E passando antes
do merge de cada sprint; fluxo principal funcionando em produção.

**Bases de dados usadas nos testes**

- **E2E:** base fictícia "Dados fictícios (teste) e2e-1" (3 alertas: 2023, 2019 e 2022), só em
  banco local. O setup recusa bancos remotos.
- **Produção:** PRODES Cerrado (INPE), versão 2026-10-16, recortada para Luís Eduardo Magalhães e
  São Desidério (BA): 8.711 alertas, 1.734 deles posteriores a 31/12/2020.

## 2. Resumo da execução (06/11/2026)

| Execução | Resultado | Evidência |
|---|---|---|
| Testes unitários (`npm run test:coverage`) | **132 de 132 passaram**, 12 arquivos | [`testes-unitarios.txt`](evidencias/testes-unitarios.txt), [`testes-unitarios-lista.txt`](evidencias/testes-unitarios-lista.txt) |
| Cobertura em `src/lib/geo` (RNF12, mínimo 70%) | 96,53% instruções · 92,68% ramos · 92,3% funções · 98,61% linhas | [`testes-unitarios.txt`](evidencias/testes-unitarios.txt) |
| Testes E2E (`npm run test:e2e`) | **6 de 6 passaram** (2,9 min) | [`testes-e2e.txt`](evidencias/testes-e2e.txt), [`e2e/`](evidencias/e2e/) |
| Lint, typecheck e build | Sem erros nem avisos | [`lint-typecheck-build.txt`](evidencias/lint-typecheck-build.txt) |
| CI no GitHub Actions | **14 de 14 execuções com sucesso** (7 PRs e 7 pushes na `main`) | [`ci-execucoes.txt`](evidencias/ci-execucoes.txt) |
| Teste manual em produção | **18 de 18 casos passaram**; 2 defeitos encontrados (seção 6, defeitos 7 e 8) | [`producao/`](evidencias/producao/) |

## 3. Casos de teste automatizados

### 3.1 E2E (Playwright)

| ID | Caso | Requisitos | Resultado |
|---|---|---|---|
| E2E-01 | Cadastro → propriedade → desenho de um talhão de ~5 ha no mapa. Confere vértices visíveis, "Desfazer último ponto", Esc, área em tempo real e talhão salvo | RF01, RF03, RF04, RF05, RF06 | Passou |
| E2E-02 | Importa GeoJSON (recusa arquivo com 3 polígonos), analisa e mostra **Risco atenção** com 0,3 ha (0,25%) em vermelho. O alerta de 2019 é ignorado; o risco aparece na lista da propriedade | RF07, RF09, RF10, RF11, RF12, RN01 | Passou |
| E2E-03 | Talhão fora da cobertura: "Região sem dados", sem risco. A mensagem diz o que a base cobre; o editor mostra a área coberta, com legenda e "Ver área coberta" | UC4 (exceção) | Passou |
| E2E-04 | Gera o dossiê (resumo padrão, sem chave do Gemini), baixa o PDF e confere a assinatura `%PDF-`. Abre `/verificar/{codigo}` **sem login**: "Dossiê autêntico", hash igual ao SHA-256 do arquivo baixado e nenhum nome, e-mail ou nome da propriedade na página. A conferência do arquivo aceita o original e recusa um PDF com 1 byte alterado. Código em minúsculas e código inexistente tratados. **Outro usuário recebe 404** ao pedir o PDF. Histórico mostra o código do dossiê. Excluir talhão e propriedade fica **bloqueado**. Lista de propriedades mostra o risco | RF14–RF18, RF13, RF20, RN04, RNF06, RNF10, wireframe 2 | Passou |
| E2E-05 | Renomear o talhão mantém a análise; trocar o polígono a torna **obsoleta**, some o botão "Gerar dossiê PDF", o histórico mostra "Obsoleta" e a lista de propriedades fica sem risco | RN03, RN02, RF13 | Passou |
| E2E-06 | Propriedade com dois talhões a ~195 km; ao editar um deles, o mapa enquadra só ele (largura visível < 5 km). Com o código anterior à correção, o teste falhou: o mapa mostrava ~215 km | RF08, defeito 7 | Passou |

Capturas geradas pelos testes: [`evidencias/e2e/`](evidencias/e2e/), por exemplo
[`resultado-com-dossie.png`](evidencias/e2e/resultado-com-dossie.png),
[`verificacao.png`](evidencias/e2e/verificacao.png) e
[`analise-obsoleta.png`](evidencias/e2e/analise-obsoleta.png) e
[`editar-enquadrado.png`](evidencias/e2e/editar-enquadrado.png). Elas usam a conta "Teste E2E",
criada pelo próprio teste num banco local.

### 3.2 Unitários (Vitest)

| Arquivo › bloco | Testes | Requisitos |
|---|---|---|
| `geo/talhao.test.ts` › validarGeometriaTalhao | 20 | RF05, RF06 (fechado, auto-interseção, 0,1–10.000 ha, coordenadas WGS 84) |
| `geo/talhao.test.ts` › calcularCentroide, formatarHa | 4 | RF15, RF06 |
| `geo/geojson.test.ts` › lerTalhaoGeoJSON, listarFeicoes | 14 | RF07 (formatos aceitos, CRS diferente, UTM, vários polígonos, auto-interseção) |
| `geo/analise.test.ts` › analisarSobreposicao | 7 | RF09, RN01 (data de corte, união de alertas sobrepostos, ruído < 1 m²) |
| `geo/analise.test.ts` › classificarRisco | 8 | RF10 (limites de 1% e 0,5 ha) |
| `geo/analise.test.ts` › talhaoCoberto, formatarPercentual | 7 | UC4 (tolerância de 0,1%), RF11 |
| `alertas/importacao.test.ts` | 21 | RF19 (datas em vários formatos, descartes com motivo, reparo de auto-interseção, cobertura) |
| `cobertura.test.ts` | 3 | UC4 (mensagem com os municípios cobertos) |
| `dossie/resumo.test.ts` | 15 | RF16, RNF10 (texto padrão ≤ 120 palavras, sem dados pessoais no prompt, chave só no cabeçalho, queda para o padrão em HTTP 429, erro de rede, resposta vazia e timeout) |
| `dossie/conteudo.test.ts` | 7 | RF15, RF17 (formato do código, SHA-256, URL de verificação, cópia dos dados sem e-mail) |
| `dossie/desenho.test.ts` | 5 | RF15 (mapa enquadrado com norte para cima, barra de escala), US12 (QR code igual ao da biblioteca `qrcode`) |
| `dossie/pdf.test.tsx` | 3 | RF14, RF15 (PDF com e sem alertas e com 20 alertas) |
| `validacao.test.ts` | 14 | RF01, RF03 (esquemas de formulário, redirecionamento interno seguro) |
| `risco.test.ts`, `formato.test.ts` | 4 | Risco da propriedade (wireframe 2), datas no horário de Brasília |
| **Total** | **132** | |

Lista completa, teste a teste: [`testes-unitarios-lista.txt`](evidencias/testes-unitarios-lista.txt).

## 4. Teste manual em produção

Executado em **06/11/2026** em https://rastroverde.vercel.app. As análises ficaram registradas às 08:45 e 08:48 (Brasília).
Usamos a propriedade "Fazenda Teste Produção" (Luís Eduardo Magalhães/BA, soja) e dois talhões
reais de LEM, círculos de pivô de 112,66 ha, escolhidos a partir dos próprios dados do PRODES. Os
passos com login foram feitos na sessão de uma conta de teste já aberta no Chrome. As páginas
públicas foram abertas num navegador headless, sem login.

| ID | Passo | Esperado | Obtido | Resultado |
|---|---|---|---|---|
| P-01 | Abrir `/login`, `/cadastro` e `/verificar` sem login | HTTP 200 | 200 | Passou |
| P-02 | Abrir `/propriedades` e `/dossies/{codigo}/pdf` sem login | Redireciona para `/login` | 307 para `/login` | Passou |
| P-03 | Conferir a região das funções (cabeçalho `x-vercel-id`) | Perto do banco (`us-west-2`) | `gru1::pdx1` (entrada em São Paulo, função em Oregon) | Passou |
| P-04 | Página de verificação fora dos buscadores | `noindex` | `noindex, nofollow` | Passou |
| P-05 | Cadastrar a propriedade | Página da propriedade criada | Criada | Passou |
| P-06 | Importar o GeoJSON do Pivô 1 | Polígono no mapa, 112,66 ha | "Importado … (112,66 ha)" | Passou |
| P-07 | Analisar o Pivô 1 | Risco alto, mesmo resultado do teste local | **Risco alto, 16,47 ha (14,62%), 2 alertas** (31/07/2022 e 28/07/2021) | Passou |
| P-08 | Gerar o dossiê do Pivô 1 | Dossiê emitido com resumo da IA | `RV-2026-7VATD6`, "Resumo redigido por IA (Gemini)" | Passou |
| P-09 | Baixar o PDF | `application/pdf`, começa com `%PDF-` | 200, `application/pdf`, 13.058 bytes, `%PDF-`. Baixado de novo depois pelo botão **Baixar dossiê PDF**: mesmo hash da página de verificação ([arquivo](evidencias/producao/dossie-RV-2026-7VATD6.pdf), [página 1](evidencias/producao/25-dossie-pdf-pagina1.png)) | Passou |
| P-10 | Endereço impresso ao lado do QR code | `https://rastroverde.vercel.app/verificar/RV-2026-7VATD6` | Igual (extraído do conteúdo do PDF) | Passou |
| P-11 | Aviso legal e resumo da IA no PDF | Presentes | Presentes | Passou |
| P-12 | Abrir `/verificar/RV-2026-7VATD6` | "Dossiê autêntico", sem dados pessoais | Correto; mostra cultura, município, risco, áreas, base e hash | Passou |
| P-13 | Hash do PDF baixado = hash da página | Iguais | Iguais | Passou |
| P-14 | "Conferir o arquivo PDF recebido" com o PDF baixado | "O arquivo confere" | "O arquivo confere: é exatamente o dossiê emitido." | Passou |
| P-15 | Importar e analisar o Pivô 2 | Risco baixo, 0 ha, sem legenda de sobreposição | Risco baixo, 0 ha (0%), legenda vermelha ausente | Passou |
| P-16 | Excluir a propriedade com dossiê emitido | Botão desativado, com o motivo | Desativado: "Esta propriedade tem talhão com dossiê emitido…" | Passou |
| P-17 | Página de verificação a 360 px de largura | Legível, sem rolagem horizontal | Legível ([captura](evidencias/producao/23-verificacao-celular-360px.png)) | Passou |
| P-18 | Ler o QR code de um dossiê com a câmera do celular | Abre `/verificar/{codigo}` com "Dossiê autêntico" | Abriu a verificação do dossiê `RV-2026-GF9S4N` no navegador do celular ([captura](evidencias/producao/24-qr-code-celular.jpg)) | Passou |

**Leitura do QR code com câmera (P-18):** feita pela PO com o celular, num dossiê emitido em
produção. A página aberta também mostra o defeito 8: o município exibido (Uruçuí/PI) não é onde
o talhão está.

**Capturas:** [`evidencias/producao/`](evidencias/producao/). Nas telas com login, o nome da
conta no cabeçalho foi ocultado por CSS antes da captura; nenhum outro conteúdo foi alterado.

## 5. Rastreabilidade: requisitos × testes

| Requisito | Teste automatizado | Produção | Observação |
|---|---|---|---|
| RF01–RF02 (cadastro, login, logout) | E2E-01 a 05 (cadastro e sessão) | P-01, P-02 | **Logout não tem teste automatizado** |
| RF03 (propriedades) | E2E-01, unitários de validação | P-05 | Editar e excluir propriedade sem dossiê não têm E2E |
| RF04–RF06 (desenho, validação, área) | E2E-01, 20 unitários | P-06 | |
| RF07 (importar GeoJSON) | E2E-02, 14 unitários | P-06, P-15 | |
| RF08 (editar, excluir talhão) | E2E-05 e E2E-06 (editar), E2E-04 (exclusão bloqueada) | — | Exclusão de talhão sem dossiê não tem E2E |
| RF09–RF12 (interseção, risco, registro, mapa) | E2E-02, 22 unitários | P-07, P-15 | |
| RF13 (histórico) | E2E-04, E2E-05 | Captura [10](evidencias/producao/10-historico.jpg) | |
| RF14–RF15 (PDF e conteúdo) | E2E-04, 15 unitários | P-08 a P-11 | |
| RF16 / RNF10 (resumo por IA e texto padrão) | 15 unitários; E2E-04 sem chave (texto padrão) | P-08 (IA real) | |
| RF17–RF18 (código, hash, verificação) | E2E-04, 7 unitários | P-12 a P-14, P-18 | A verificação pode exibir um município falso (defeito 8) |
| RF19 (importação da base) | 21 unitários | Base PRODES importada no Supabase em 06/11 | |
| RF20 / RNF04 (dono dos dados) | E2E-04 (outro usuário recebe 404 no PDF) | P-02 | As demais rotas filtram pelo dono no código; só a do PDF tem teste com 2 usuários |
| RN01 (data de corte) | Unitários de análise; E2E-02 (alerta de 2019 ignorado) | P-07 (alertas de 2021 e 2022 contam) | |
| RN02–RN03 (dossiê só da análise atual) | E2E-05 | — | |
| RN04 (dossiê imutável, exclusão bloqueada) | E2E-04 | P-16 | |
| RNF01 (análise ≤ 5 s em talhão ≤ 1.000 ha) | — | — | Medido por script local com a base PRODES: 60–82 ms por análise de talhões de ~1.000 ha. **Não há teste automatizado de desempenho** |
| RNF02 (PDF ≤ 10 s com IA) | — | P-08 | O dossiê ficou pronto dentro da espera de 10 s do teste, sem cronometragem precisa. A chamada ao Gemini (`gemini-3.5-flash-lite`) levou de 1,2 a 1,6 s em 8 chamadas reais feitas localmente |
| RNF05 (HTTPS; chaves no servidor) | — | P-01 a P-17 em HTTPS | A chave do Gemini vai em cabeçalho, nunca na URL (teste unitário) |
| RNF06 (sem dados pessoais na verificação) | E2E-04 | P-12 | |
| RNF08 (responsivo a partir de 360 px) | — | P-17 | Só a página de verificação foi testada a 360 px |
| RNF09 (risco por cor e texto) | E2E-02/04 procuram o texto "Risco …" | Capturas 08 e 11 | |
| RNF12 (cobertura ≥ 70% em geo) | Cobertura no CI | — | 96,53% de instruções |
| RNF14 (aviso legal) | — | P-11 | |

## 6. Defeitos e achados

| # | Achado | Como apareceu | Situação |
|---|---|---|---|
| 1 | Mapa somente leitura saía do contêiner, e os vértices do desenho ficavam invisíveis ("Worker failed to load") | Teste no navegador, Sprint 1 | Corrigido (PR #1) e coberto pelo E2E-01 |
| 2 | 37 polígonos do PRODES eram descartados por auto-interseção, 28 deles posteriores ao corte, o que esconderia desmatamento | Simulação da importação | Corrigido: reparo em vez de descarte (PR #4), com teste unitário |
| 3 | O rodapé do PDF era desenhado fora da página | Inspeção dos PDFs gerados no teste unitário | Corrigido antes do PR #5 |
| 4 | `gemini-flash-latest` passava do timeout de 8 s, então todo dossiê saía com o texto padrão | Teste com a API real | Corrigido: modelo `gemini-3.5-flash-lite` (PR #6) |
| 5 | O resumo da IA exagerava ("impedimento de venda", "atende às exigências") | Teste com a API real | Corrigido: prompt com o sentido aprovado de cada risco (PR #6) |
| 6 | Talhão fora da cobertura não sabia onde havia dados | Uso real (talhões fora de LEM e São Desidério) | Corrigido (PR #7), coberto pelo E2E-03 |
| 7 | Ao editar um talhão, o mapa enquadra **todos** os talhões da propriedade. Com dois pivôs a ~50 km um do outro, o talhão editado aparece como um ponto ([captura 07](evidencias/producao/07-editar-talhao.jpg)) | Teste em produção, 06/11 | Corrigido no PR #9: o mapa enquadra só o talhão editado. Coberto pelo E2E-06 |
| 8 | **O município declarado não é conferido com a localização do polígono.** Dois dossiês foram emitidos em produção para propriedades cadastradas como Uruçuí/PI (`RV-2026-GF9S4N`) e "Urucui"/PI (`RV-2026-JY61A8`), com talhões cujo centroide fica em Luís Eduardo Magalhães/BA (limites do IBGE). O PDF e a página pública mostram ao comprador o município declarado, que é falso ([captura](evidencias/producao/24-qr-code-celular.jpg)). O município também é texto livre: no banco há grafias diferentes para o mesmo lugar | Leitura do QR code (P-18) e consulta somente leitura ao banco, 06/11 | **Aberto**. Proposta de correção em discussão com a PO |

O dossiê `RV-2026-7VATD6`, emitido em produção antes do PR #6 entrar no ar, tem o resumo feito com
o prompt anterior. O texto está correto, mas fica gravado assim, porque o dossiê é imutável.

## 7. Como repetir os testes

```bash
npm test                      # unitários
npm run test:coverage         # unitários + cobertura
# E2E: Postgres local de teste (veja o README, seção "Testes E2E")
npx prisma dev -d -n rastroverde-e2e
DATABASE_URL="<url>" DIRECT_URL="<url>" npm run db:deploy
DATABASE_URL="<url>" npm run test:e2e
```
