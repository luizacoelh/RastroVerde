-- Dossiê imutável (US10, RN04): guarda o PDF, o resumo (IA ou texto padrão) e uma cópia dos dados
-- usados na emissão. O dossiê nunca foi emitido antes desta versão, então a tabela está vazia;
-- se não estiver, as colunas NOT NULL fazem a migração falhar sem alterar nada.

-- DropForeignKey
ALTER TABLE "dossie" DROP CONSTRAINT "dossie_analiseId_fkey";

-- AlterTable
ALTER TABLE "dossie" DROP COLUMN "resumoIA",
ADD COLUMN     "conteudo" JSONB NOT NULL,
ADD COLUMN     "pdf" BYTEA NOT NULL,
ADD COLUMN     "resumo" TEXT NOT NULL,
ADD COLUMN     "resumoPorIA" BOOLEAN NOT NULL;

-- AddForeignKey: RESTRICT impede excluir a análise (e, em cascata, o talhão e a propriedade)
-- enquanto houver dossiê emitido (RN04).
ALTER TABLE "dossie" ADD CONSTRAINT "dossie_analiseId_fkey" FOREIGN KEY ("analiseId") REFERENCES "analise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
