-- Limites dos municípios (malha do IBGE) para conferir se o talhão está no município declarado
-- na propriedade (defeito 8). Dado de referência, preenchido por `npm run municipios:importar`.

-- CreateTable
CREATE TABLE "municipio" (
    "codigoIbge" CHAR(7) NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "geometria" JSONB NOT NULL,
    "bboxMinLng" DOUBLE PRECISION NOT NULL,
    "bboxMinLat" DOUBLE PRECISION NOT NULL,
    "bboxMaxLng" DOUBLE PRECISION NOT NULL,
    "bboxMaxLat" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "municipio_pkey" PRIMARY KEY ("codigoIbge")
);

-- CreateIndex
CREATE INDEX "municipio_bboxMinLng_bboxMaxLng_bboxMinLat_bboxMaxLat_idx" ON "municipio"("bboxMinLng", "bboxMaxLng", "bboxMinLat", "bboxMaxLat");

-- Toda tabela nova vem com RLS na mesma migração (ADR-05): fecha a Data API do Supabase.
ALTER TABLE "municipio" ENABLE ROW LEVEL SECURITY;
