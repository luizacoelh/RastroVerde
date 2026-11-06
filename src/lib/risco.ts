// Níveis de risco (RF10). Módulo leve, sem Turf, para uso na interface.
export type Risco = "BAIXO" | "ATENCAO" | "ALTO";

export const ROTULO_RISCO: Record<Risco, string> = {
  BAIXO: "Baixo",
  ATENCAO: "Atenção",
  ALTO: "Alto",
};

/** Explicação em linguagem simples (RNF09: o risco é indicado por cor e texto). */
export const EXPLICACAO_RISCO: Record<Risco, string> = {
  BAIXO: "Nenhum alerta de desmatamento detectado após 31/12/2020 dentro do talhão.",
  ATENCAO:
    "Há sobreposição pequena com alerta de desmatamento após 31/12/2020 (menos de 1% da área e menos de 0,5 ha). Verifique o alerta antes de exportar.",
  ALTO: "Há sobreposição com alerta de desmatamento após 31/12/2020 acima dos limites de atenção. O talhão não atende ao EUDR sem uma justificativa.",
};

const GRAVIDADE: Record<Risco, number> = { BAIXO: 0, ATENCAO: 1, ALTO: 2 };

/** O risco mais grave da lista (ex.: o de uma propriedade é o do pior talhão), ou null se vazia. */
export function riscoMaisGrave(riscos: Iterable<Risco>): Risco | null {
  let pior: Risco | null = null;
  for (const r of riscos) if (pior === null || GRAVIDADE[r] > GRAVIDADE[pior]) pior = r;
  return pior;
}
