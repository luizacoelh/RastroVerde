-- A tabela de controle do Prisma também fica no schema "public" e, por isso, exposta pela
-- Data API do Supabase (alerta CRITICAL "RLS Disabled in Public"). Ativamos RLS sem políticas,
-- como nas tabelas do app (ADR-05): a Data API é negada, e o Prisma, que conecta como dono da
-- tabela, não é afetado (o dono ignora RLS, pois não usamos FORCE ROW LEVEL SECURITY).
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
