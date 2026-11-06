-- Descrição legível da área coberta por cada base (ex.: municípios do recorte), exibida quando
-- o talhão cai fora da cobertura ("região sem dados", UC4). Coluna opcional: bases antigas ficam
-- sem descrição até serem atualizadas pelo importador (--descricao-cobertura).
ALTER TABLE "base_alertas" ADD COLUMN "descricaoCobertura" TEXT;
