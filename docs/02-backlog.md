# 2. Backlog do Produto Inicial — RastroVerde

Priorização **MoSCoW** (Must / Should / Could / Won't) + estimativa em **story points** (Fibonacci).
Formato: *Como &lt;quem&gt;, quero &lt;o quê&gt;, para &lt;para quê&gt;.*

Capacidade estimada: ~2 pessoas × 3 sprints ≈ **45–55 pontos**. Os itens **Must** somam 39 pontos.

## Épicos

| ID | Épico | Objetivo |
|---|---|---|
| E1 | Acesso | Usuário entra no sistema com segurança |
| E2 | Propriedades e talhões | Registrar onde se produz |
| E3 | Análise de desmatamento | Checar sobreposição com alertas pós-2020 |
| E4 | Dossiê de conformidade | Gerar evidência compartilhável |
| E5 | Verificação pública | Comprador confere a autenticidade |

## Histórias de usuário

| ID | Épico | História | Prior. | Pts | Sprint |
|---|---|---|---|---|---|
| US01 | E1 | Como **produtor**, quero **criar uma conta com e-mail e senha**, para **guardar minhas propriedades**. | Must | 3 | 1 |
| US02 | E1 | Como **produtor**, quero **entrar e sair do sistema**, para **acessar meus dados com segurança**. | Must | 2 | 1 |
| US03 | E2 | Como **produtor**, quero **cadastrar uma propriedade** (nome, município, UF, cultura, CAR), para **organizar meus talhões**. | Must | 3 | 1 |
| US04 | E2 | Como **produtor**, quero **desenhar o talhão no mapa**, para **informar a área exata de produção**. | Must | 8 | 1 |
| US05 | E2 | Como **técnico**, quero **importar um talhão em GeoJSON**, para **aproveitar o polígono que já tenho**. | Should | 3 | 2 |
| US06 | E2 | Como **produtor**, quero **ver, editar e excluir talhões**, para **manter os dados corretos**. | Must | 3 | 1 |
| US07 | E3 | Como **produtor**, quero **solicitar a análise de um talhão**, para **saber se há desmatamento após 2020**. | Must | 8 | 2 |
| US08 | E3 | Como **produtor**, quero **ver o risco (Baixo/Atenção/Alto) e a área sobreposta no mapa**, para **entender o resultado**. | Must | 5 | 2 |
| US09 | E3 | Como **produtor**, quero **ver o histórico de análises do talhão**, para **acompanhar mudanças**. | Should | 2 | 3 |
| US10 | E4 | Como **produtor**, quero **gerar o dossiê em PDF**, para **enviar ao comprador**. | Must | 5 | 3 |
| US11 | E4 | Como **produtor**, quero **um resumo em linguagem simples feito por IA no dossiê**, para **explicar o resultado a quem não é técnico**. | Should | 3 | 3 |
| US12 | E5 | Como **comprador**, quero **ler o QR code e ver uma página de verificação**, para **confirmar que o dossiê é autêntico**. | Must | 2 | 3 |
| US13 | E3 | Como **administrador**, quero **importar a base de alertas por script**, para **atualizar os dados de referência**. | Should | 3 | 2 |
| US14 | E2 | Como **técnico**, quero **gerenciar propriedades de vários produtores**, para **atender minha carteira**. | Could | 5 | — |
| US15 | E3 | Como **produtor**, quero **checar terras indígenas e embargos do IBAMA**, para **ter uma análise completa**. | Won't (MVP) | — | — |
| US16 | E4 | Como **exportador**, quero **enviar a declaração direto ao TRACES (UE)**, para **evitar retrabalho**. | Won't (MVP) | — | — |

## Critérios de aceitação (histórias Must)

**US04 — Desenhar talhão**
- Dado o mapa aberto, quando desenho um polígono fechado e salvo, então ele fica vinculado à propriedade e a área em hectares é exibida.
- Polígonos que se cruzam (auto-interseção) são recusados com mensagem clara.

**US06 — Ver, editar e excluir talhões**
- Talhão com dossiê emitido não pode ser excluído; o sistema explica o motivo (RN04).
  *Implementado na Sprint 3, junto com o dossiê (US10).*

**US07 — Solicitar análise**
- O sistema calcula a área de interseção entre o talhão e os alertas com data de detecção > 31/12/2020.
- O resultado é salvo com data/hora, versão da base de dados e área sobreposta (ha e %).

**US08 — Ver risco**
- Sem sobreposição → **Baixo**; sobreposição < 1% da área ou < 0,5 ha → **Atenção**; acima disso → **Alto**.
- A área sobreposta aparece destacada em vermelho no mapa.

**US10 — Gerar dossiê**
- PDF contém: dados da propriedade, mapa do talhão, coordenadas, resultado, fonte dos dados, data, código único, QR code e aviso legal.

**US12 — Verificação pública**
- URL `/verificar/{codigo}` sem login mostra: válido/inválido, data, risco e hash do dossiê.

## Pós-MVP (registrado, fora das sprints)

| Item | Origem | Observação |
|---|---|---|
| Limite de tentativas de login (rate limiting) | Revisão da Sprint 1 | Mitiga força bruta de senha; hoje o login usa só bcrypt e mensagem genérica. |

## Definição de Pronto (DoD)

- Código revisado pelo outro integrante via Pull Request.
- Critérios de aceitação atendidos e testados.
- Lint e build passando no CI.
- Publicado no ambiente de produção (Vercel).
