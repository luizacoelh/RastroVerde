// Dossiês (US10, US12). Consultas do produtor filtram pelo dono (RF20/RNF04).
import "server-only";
import { db } from "@/lib/db";

/** RN04: mensagens exibidas quando a exclusão é bloqueada por dossiê emitido. */
export const MOTIVO_BLOQUEIO_TALHAO =
  "Este talhão tem dossiê emitido e não pode ser excluído: o dossiê precisa continuar verificável pelo comprador.";
export const MOTIVO_BLOQUEIO_PROPRIEDADE =
  "Esta propriedade tem talhão com dossiê emitido e não pode ser excluída: o dossiê precisa continuar verificável pelo comprador.";

/** Quantos dossiês foram emitidos para o talhão ou, sem talhaoId, para a propriedade inteira. */
export async function contarDossies(usuarioId: string, propriedadeId: string, talhaoId?: string) {
  return db.dossie.count({
    where: {
      analise: { talhao: { propriedadeId, propriedade: { usuarioId }, ...(talhaoId ? { id: talhaoId } : {}) } },
    },
  });
}
