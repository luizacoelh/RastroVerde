# 10. Roteiro da Apresentação — RastroVerde

**Duração:** 12 min de fala + 3 min de perguntas (limite de 15 min).
**Demo:** ao vivo em https://rastroverde.vercel.app.

| Bloco | Tempo | Quem fala |
|---|---|---|
| 1. Problema: o EUDR | 2 min | _[preencher]_ |
| 2. A solução | 1,5 min | _[preencher]_ |
| 3. Demonstração ao vivo | 5 min | _[preencher]_ |
| 4. Decisões técnicas | 1,5 min | _[preencher]_ |
| 5. Processo: Scrum, PRs e CI | 1,5 min | _[preencher]_ |
| 6. Próximos passos e encerramento | 0,5 min | _[preencher]_ |
| Perguntas | 3 min | todos |

---

## Antes de começar (checklist)

- [ ] Conta de teste logada no navegador da apresentação, com **nome fictício** no cadastro (o
      nome aparece no cabeçalho da tela).
- [ ] Os arquivos [`apresentacao/pivo-lem-com-sobreposicao.geojson`](apresentacao/pivo-lem-com-sobreposicao.geojson)
      e [`pivo-lem-sem-sobreposicao.geojson`](apresentacao/pivo-lem-sem-sobreposicao.geojson) no computador.
- [ ] Celular com câmera para ler o QR code, na mesma rede ou com 4G.
- [ ] Abas abertas: a propriedade de demonstração e `/verificar`.
- [ ] Plano B sem internet: capturas em [`evidencias/producao/`](evidencias/producao/) e o
      [PDF do dossiê emitido em produção](evidencias/producao/dossie-RV-2026-7VATD6.pdf).
- [ ] Lembrar: **todo dossiê emitido em produção é permanente** e trava a exclusão da
      propriedade (RN04). Use uma propriedade só para a demo, por exemplo "Fazenda Demonstração".

## 1. Problema: o EUDR (2 min)

- O **Regulamento (UE) 2023/1115 (EUDR)** proíbe a entrada na União Europeia de soja, café, cacau,
  carne, madeira e outros produtos vindos de áreas **desmatadas depois de 31/12/2020**, legal ou
  ilegalmente.
- Cada lote precisa de uma declaração com a **geolocalização da área de produção**.
- Grandes tradings têm equipe e sistema para isso. **Pequenos e médios produtores e cooperativas
  não têm**, e correm o risco de perder o comprador europeu ou vender com desconto.
- Frase de efeito: *"Não basta não ter desmatado: é preciso provar, com polígono e data."*

## 2. A solução (1,5 min)

- O RastroVerde transforma o polígono do talhão em um **dossiê verificável**, em quatro passos:
  **desenhar → analisar → gerar PDF → o comprador confere pelo QR code**.
- Diferenciais:
  1. **Checagem geoespacial de verdade**: interseção do polígono com os alertas oficiais do
     PRODES/INPE, não um formulário.
  2. **Documento verificável sem login**, com hash SHA-256.
  3. **Linguagem simples**: resumo por IA, com texto padrão quando a IA falha.
- Deixar claro o limite: **não substitui** a declaração oficial de diligência; é uma evidência
  técnica.

## 3. Demonstração ao vivo (5 min)

| # | Ação na tela | O que falar |
|---|---|---|
| 1 | **Minhas propriedades**: mostrar a coluna "Última análise" | "O produtor vê de cara qual propriedade tem risco." |
| 2 | **+ Nova propriedade** → "Fazenda Demonstração", Luís Eduardo Magalhães/BA, Soja | Cadastro mínimo, CAR opcional. |
| 3 | **+ Desenhar talhão**: clicar 3 ou 4 cantos e mostrar a área sendo calculada; depois **Esc** | Desenho direto no mapa, com a área em tempo real. |
| 4 | Clicar em **Ver área coberta** | "A base de hoje cobre LEM e São Desidério; fora disso o sistema avisa." |
| 5 | **Importar GeoJSON** → `pivo-lem-com-sobreposicao.geojson` → **Salvar talhão** | Quem já tem o polígono, por exemplo do técnico, importa. |
| 6 | **Analisar** → **Analisar talhão** | Resultado esperado: **Risco alto, 16,47 ha (14,62%)**, alertas de 2022 e 2021 em vermelho. "Interseção exata com o PRODES; só conta o que é posterior a 31/12/2020." |
| 7 | **Gerar dossiê PDF** | Mostrar o código `RV-…` e o resumo marcado "redigido por IA (Gemini)". |
| 8 | **Baixar dossiê PDF** e abrir | Percorrer: dados, mapa, alertas, resumo, QR code e aviso legal. |
| 9 | **Ler o QR code com o celular** | A página "Dossiê autêntico" abre no celular, sem login e sem dados pessoais. |
| 10 | Na verificação, **Conferir o arquivo PDF recebido** → escolher o PDF baixado | "O arquivo confere": o hash prova que o PDF não foi alterado. |
| 11 | Voltar à propriedade e mostrar o **Excluir** desativado | RN04: dossiê emitido não some. |

Se sobrar tempo: importar o `pivo-lem-sem-sobreposicao.geojson` e analisar. O resultado esperado é
**Risco baixo, 0 ha**.

Os valores esperados nos passos 6 e "se sobrar tempo" foram obtidos no teste em produção de
06/11/2026 (relatório de testes, casos P-07 e P-15).

## 4. Decisões técnicas (1,5 min)

Um slide com 4 pontos (detalhes em [09-documentacao-tecnica.md](09-documentacao-tecnica.md)):

1. **Turf.js em vez de PostGIS:** filtro por retângulo no banco e interseção exata no servidor.
   Medido localmente com a base PRODES: 60 a 82 ms por análise de talhões de ~1.000 ha (o
   requisito pede até 5 s).
2. **Base de alertas versionada:** PRODES Cerrado 2026-10-16, 8.711 alertas, com a cobertura de
   cada base. Cada análise registra a versão usada. O PRODES 2021 conta como pós-corte, a opção
   conservadora.
3. **Dossiê imutável:** o PDF é gravado uma vez e o hash SHA-256 aparece na página pública. O
   próprio banco impede excluir o que tem dossiê.
4. **IA opcional:** se o Gemini falhar, demorar mais de 8 s ou não houver chave, sai o texto padrão.
   O teste com a API real mudou duas coisas: o modelo, porque o anterior estourava o tempo, e o
   prompt, porque a IA prometia mais do que a análise garante.

## 5. Processo: Scrum, PRs e CI (1,5 min)

Use só os fatos abaixo; eles saem do GitHub e de [07-plano-e-relatorio-de-testes.md](07-plano-e-relatorio-de-testes.md):

- **Backlog com 16 histórias** (MoSCoW e story points) e **3 sprints planejadas**: acesso e
  talhões, análise, dossiê.
- **7 pull requests**, todos mesclados na `main`, com branches `feat/*` e `fix/*` e Conventional
  Commits:

  | PR | Conteúdo |
  |---|---|
  | #1 | Sprint 1: acesso, propriedades e desenho de talhões |
  | #2 | Sprint 2: análise de desmatamento |
  | #3 | Correção de segurança: RLS na tabela do Prisma (alerta do Supabase) |
  | #4 | Base real PRODES Cerrado |
  | #5 | Sprint 3: dossiê, IA e verificação |
  | #6 | Ajuste do modelo e do prompt da IA após teste real |
  | #7 | Região sem dados mostra a área coberta |

- **CI no GitHub Actions** em todo PR e push: lint, typecheck, 132 testes unitários com cobertura
  e build. **14 de 14 execuções com sucesso.**
- **6 testes E2E** (Playwright) rodados antes de cada merge, mais o **teste manual em produção**
  (18 de 18 casos, incluindo a leitura do QR code com o celular).
- Mostrar a tabela de defeitos do relatório de testes: os testes acharam problemas reais (polígonos
  descartados, IA lenta e exagerada, PDF com rodapé fora da página) e eles foram corrigidos antes
  da entrega.
- _[Preencher só se aconteceu: reviews de sprint, retrospectivas, quadro do GitHub Projects.]_

## 6. Próximos passos e encerramento (0,5 min)

Do backlog e da visão do produto ([01-visao.md §6](01-visao.md#evoluções-futuras-pós-mvp)):

- Mais municípios na base e, depois, dados em tempo real (MapBiomas Alerta, INPE).
- Importar o polígono pelo número do **CAR/SICAR**.
- Checagens extras: terras indígenas, unidades de conservação, embargos do IBAMA.
- Conferir o município declarado com a localização do talhão (defeito 8, achado no teste em
  produção), limite de tentativas de login e E2E no CI.

Encerramento: *"O RastroVerde transforma um polígono em uma prova que o comprador europeu confere
em segundos, pelo celular."*

## Perguntas prováveis

| Pergunta | Resposta curta |
|---|---|
| "E se o produtor desenhar o polígono errado de propósito?" | O dossiê vale para o polígono informado e mostra a coordenada e o mapa. O comprador pode confrontar com o CAR. Puxar o polígono do SICAR é o próximo passo. |
| "Por que não MapBiomas?" | O download estava fora do ar quando montamos a base (AccessDenied). O PRODES é a fonte oficial do INPE. O importador tem os campos do MapBiomas como padrão e aceita outros por opção, mas ainda não foi testado com um arquivo real do MapBiomas. |
| "E se a IA alucinar?" | O resumo é só texto explicativo. Risco, áreas e alertas vêm do cálculo. O prompt proíbe promessas jurídicas, e sem IA sai um texto padrão. |
| "O dossiê pode ser falsificado?" | Um PDF alterado tem outro hash, e a página de verificação acusa. Um código inexistente dá "não encontrado". |
| "Quanto custa rodar?" | O projeto foi planejado para os planos gratuitos da Vercel, do Supabase e do Gemini (premissa da visão do produto). _[Confirmar os planos das contas antes de responder.]_ |
