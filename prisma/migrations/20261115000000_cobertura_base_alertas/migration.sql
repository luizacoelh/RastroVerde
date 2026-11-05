-- Área coberta por cada base de alertas (UC4: "região sem dados").
-- A tabela ainda está vazia (a importação chega na Sprint 2), então as colunas podem ser NOT NULL.
-- AlterTable
ALTER TABLE "base_alertas" ADD COLUMN     "bboxMaxLat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "bboxMaxLng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "bboxMinLat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "bboxMinLng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "cobertura" JSONB NOT NULL;

