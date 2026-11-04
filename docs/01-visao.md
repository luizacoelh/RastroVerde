# 1. Documento de Visão do Produto — RastroVerde

| Item | Valor |
|---|---|
| Versão | 1.0 — 04/11/2026 |
| Equipe | Luiza Coelho (SM/Dev), Lucas (Dev) |
| Product Owner | Professor da disciplina |

## 1. Contexto

O **Regulamento Europeu contra o Desmatamento (EUDR — Regulamento (UE) 2023/1115)** proíbe a entrada
na União Europeia de soja, café, cacau, carne bovina, couro, madeira, borracha e óleo de palma que
venham de áreas desmatadas **após 31/12/2020**, legal ou ilegalmente. Cada lote precisa de uma
*declaração de diligência* com a **geolocalização (polígono) da área de produção**.

A UE é o segundo maior destino do agronegócio brasileiro. Grandes tradings têm equipes e sistemas
próprios para isso; **produtores pequenos e médios e cooperativas não têm**, e correm o risco de
perder compradores ou vender com deságio.

## 2. Problema

| O problema de | Não conseguir comprovar, de forma simples e confiável, que a área produtiva não teve desmatamento após 2020 |
|---|---|
| afeta | produtores rurais pequenos/médios, cooperativas e técnicos agrícolas |
| cujo impacto é | perda de acesso ao mercado europeu, retrabalho manual (planilhas, prints de mapa), dependência de consultorias caras |
| uma boa solução seria | um sistema web que receba o polígono da área, faça a checagem automática contra bases públicas de desmatamento e gere um documento verificável |

## 3. Solução proposta

O **RastroVerde** é uma aplicação web em que o usuário:

1. Cadastra a propriedade e desenha (ou importa em GeoJSON) os **talhões** no mapa.
2. Solicita uma **análise**: o sistema cruza o polígono com uma base de **alertas de desmatamento**
   (recorte do MapBiomas Alerta / PRODES) e calcula a área sobreposta após 31/12/2020.
3. Recebe uma **classificação de risco** (Baixo / Atenção / Alto) com o mapa da sobreposição.
4. Gera um **dossiê em PDF** com dados da área, resultado, fonte dos dados, data da análise,
   um **resumo em linguagem simples redigido por IA (Gemini)** e um **QR code**.
5. O comprador lê o QR code e abre uma **página pública de verificação** que confirma a
   autenticidade do dossiê (código + hash do conteúdo).

### Diferenciais

- Checagem geoespacial automática (não é só um formulário).
- Documento verificável por terceiros sem login.
- Linguagem acessível para quem não é especialista em geoprocessamento.

## 4. Usuários-alvo

| Perfil | Descrição | Necessidade principal |
|---|---|---|
| **Produtor rural** (principal) | Pequeno/médio produtor de soja, café ou cacau que vende para exportadores | Provar que a área é livre de desmatamento sem contratar consultoria |
| **Técnico agrícola / consultor** | Atende vários produtores | Cadastrar várias áreas e gerar dossiês em série |
| **Comprador / exportador** (externo) | Recebe o dossiê | Verificar rapidamente se o documento é autêntico |

## 5. Objetivos de negócio

| Objetivo | Indicador (MVP) |
|---|---|
| Reduzir o tempo para produzir uma evidência de conformidade | Do cadastro do talhão ao PDF em **menos de 5 minutos** |
| Dar confiança ao comprador | 100% dos dossiês verificáveis por QR code |
| Ser usável por não especialistas | Fluxo principal em no máximo **4 telas** |

## 6. Escopo do MVP

O MVP é deliberadamente pequeno para caber em 4 semanas (05/11 a 04/12/2026) com 2 pessoas.

### Dentro do escopo

- Cadastro/login com e-mail e senha.
- Cadastro de propriedade (nome, município/UF, cultura, nº do CAR como texto).
- Cadastro de talhão: desenhar polígono no mapa **ou** importar arquivo GeoJSON.
- Análise de sobreposição contra uma **base de alertas pré-carregada** (recorte de uma região de
  teste, importado uma vez por script).
- Classificação de risco por regra simples e fixa.
- Geração do dossiê PDF com QR code e resumo por IA.
- Página pública de verificação do dossiê.
- Histórico de análises por talhão.

### Fora do escopo (não será feito no MVP)

- Integração automática com o SICAR, MapBiomas ou INPE em tempo real (usamos recorte estático).
- Processamento de imagens de satélite ou modelos próprios de visão computacional.
- Envio da declaração ao sistema oficial da UE (TRACES).
- Checagem de terras indígenas, embargos do IBAMA ou trabalho escravo (ficam como evolução).
- Rastreio de lotes, cadeia de custódia, blockchain.
- Aplicativo mobile, modo offline, multi-idioma.
- Perfis de cooperativa/multiempresa, pagamentos, planos.

Qualquer item novo entra no backlog como "pós-MVP" e só é puxado com aprovação do PO.

## 7. Premissas e restrições

- Os dados de desmatamento usados no MVP são uma amostra pública e **o dossiê não substitui
  a declaração oficial** — o PDF traz esse aviso.
- Equipe de 2 pessoas, ~4 semanas, ferramentas gratuitas (Vercel, Neon, Gemini free tier).
- Conformidade com a **LGPD**: coleta mínima de dados pessoais.

## 8. Riscos principais

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Base de alertas grande demais para o plano gratuito | Média | Alto | Usar recorte de 1–2 municípios |
| Equipe reduzida (Lucas ainda não confirmado) | Média | Alto | Backlog priorizado: só itens "Must" garantem o MVP |
| Cálculo geoespacial incorreto | Baixa | Alto | Testes com polígonos conhecidos (dentro/fora/parcial) |
| Limite da API de IA | Baixa | Baixo | Resumo por IA é opcional; PDF sai com texto padrão se falhar |
