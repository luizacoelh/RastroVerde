-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Risco" AS ENUM ('BAIXO', 'ATENCAO', 'ALTO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propriedade" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "cultura" TEXT NOT NULL,
    "car" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alteradoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propriedade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talhao" (
    "id" TEXT NOT NULL,
    "propriedadeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "geometria" JSONB NOT NULL,
    "areaHa" DOUBLE PRECISION NOT NULL,
    "bboxMinLng" DOUBLE PRECISION NOT NULL,
    "bboxMinLat" DOUBLE PRECISION NOT NULL,
    "bboxMaxLng" DOUBLE PRECISION NOT NULL,
    "bboxMaxLat" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alteradoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talhao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_alertas" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "importadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "base_alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "codigoFonte" TEXT,
    "geometria" JSONB NOT NULL,
    "dataDeteccao" DATE NOT NULL,
    "bboxMinLng" DOUBLE PRECISION NOT NULL,
    "bboxMinLat" DOUBLE PRECISION NOT NULL,
    "bboxMaxLng" DOUBLE PRECISION NOT NULL,
    "bboxMaxLat" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analise" (
    "id" TEXT NOT NULL,
    "talhaoId" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "areaSobrepostaHa" DOUBLE PRECISION NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "risco" "Risco" NOT NULL,
    "sobreposicao" JSONB NOT NULL,
    "obsoleta" BOOLEAN NOT NULL DEFAULT false,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossie" (
    "id" TEXT NOT NULL,
    "analiseId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "resumoIA" TEXT,
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "propriedade_usuarioId_idx" ON "propriedade"("usuarioId");

-- CreateIndex
CREATE INDEX "talhao_propriedadeId_idx" ON "talhao"("propriedadeId");

-- CreateIndex
CREATE UNIQUE INDEX "base_alertas_fonte_versao_key" ON "base_alertas"("fonte", "versao");

-- CreateIndex
CREATE INDEX "alerta_baseId_dataDeteccao_idx" ON "alerta"("baseId", "dataDeteccao");

-- CreateIndex
CREATE INDEX "alerta_bboxMinLng_bboxMaxLng_bboxMinLat_bboxMaxLat_idx" ON "alerta"("bboxMinLng", "bboxMaxLng", "bboxMinLat", "bboxMaxLat");

-- CreateIndex
CREATE INDEX "analise_talhaoId_criadaEm_idx" ON "analise"("talhaoId", "criadaEm");

-- CreateIndex
CREATE UNIQUE INDEX "dossie_analiseId_key" ON "dossie"("analiseId");

-- CreateIndex
CREATE UNIQUE INDEX "dossie_codigo_key" ON "dossie"("codigo");

-- AddForeignKey
ALTER TABLE "propriedade" ADD CONSTRAINT "propriedade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talhao" ADD CONSTRAINT "talhao_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "base_alertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analise" ADD CONSTRAINT "analise_talhaoId_fkey" FOREIGN KEY ("talhaoId") REFERENCES "talhao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analise" ADD CONSTRAINT "analise_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "base_alertas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossie" ADD CONSTRAINT "dossie_analiseId_fkey" FOREIGN KEY ("analiseId") REFERENCES "analise"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: o schema "public" é exposto pela Data API (PostgREST) aos papéis anon/authenticated.
-- A aplicação acessa o banco só pelo Prisma (papel dono das tabelas, que ignora RLS), então
-- ativamos RLS sem nenhuma política: qualquer acesso pela Data API é negado. Ver ADR-05.
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "propriedade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "talhao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "base_alertas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alerta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dossie" ENABLE ROW LEVEL SECURITY;
