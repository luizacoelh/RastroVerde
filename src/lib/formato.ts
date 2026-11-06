// Formatos de data usados nas telas e no dossiê (horário de Brasília).
const FUSO = "America/Sao_Paulo";

/** 06/11/2026, 14:32 */
export const formatoDataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO });
/** 06/11/2026 */
export const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: FUSO });
/** 06/11 */
export const formatoDia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });

/** Datas sem hora gravadas em UTC (ex.: data de detecção "2023-05-10") → 10/05/2023. */
export function formatarDataIso(dataIso: string): string {
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
