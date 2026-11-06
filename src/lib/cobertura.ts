// Área coberta pelas bases de alertas (UC4): texto para a mensagem de "região sem dados".
// Módulo leve, sem Turf, para uso na interface.

/** Junta descrições: "A", "A e B", "A, B e C". */
function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * Mensagem quando o talhão cai fora da cobertura. Cita o que as bases cobrem (ex.: "Luís Eduardo
 * Magalhães e São Desidério (BA)") para o usuário saber onde a análise funciona.
 */
export function mensagemRegiaoSemDados(descricoes: (string | null | undefined)[]): string {
  const unicas = [...new Set(descricoes.map((d) => d?.trim()).filter((d): d is string => Boolean(d)))];
  const inicio =
    "Região sem dados: a base de alertas importada não cobre toda a área deste talhão, então o risco não foi calculado.";
  if (unicas.length === 0) {
    return `${inicio} A área coberta aparece em azul tracejado no mapa de edição do talhão.`;
  }
  const cobre = unicas.length === 1 ? `A base atual cobre ${unicas[0]}` : `As bases atuais cobrem ${juntar(unicas)}`;
  return `${inicio} ${cobre}. A área coberta aparece em azul tracejado no mapa de edição do talhão.`;
}
