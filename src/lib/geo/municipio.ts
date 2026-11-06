// Confere se o talhão está no município declarado na propriedade (defeito 8). O dossiê mostra o
// município ao comprador; sem esta conferência, um talhão de Luís Eduardo Magalhães/BA saía com
// "Uruçuí/PI". A regra bloqueia a análise e a emissão do dossiê quando não confere.
import { featureCollection } from "@turf/helpers";
import { intersect } from "@turf/intersect";
import { AREA_MINIMA_SOBREPOSICAO_HA } from "./analise";
import { calcularAreaHa, type GeometriaTalhao } from "./talhao";

export type MunicipioDeclarado = { municipio: string; uf: string };
export type LimiteMunicipio = { nome: string; uf: string; geometria: GeometriaTalhao };

export type ConferenciaMunicipio =
  /** O talhão tem área dentro do município declarado. */
  | { situacao: "confere" }
  /** O talhão está em municípios conhecidos, mas em nenhum deles é o declarado. */
  | { situacao: "diverge"; encontrado: { nome: string; uf: string } }
  /** Nenhum limite conhecido cruza o talhão: não há como conferir (fora das bases, "região sem dados"). */
  | { situacao: "desconhecido" };

/** "Uruçuí", "URUCUI" e " urucui " ficam iguais; hífen e apóstrofo não importam ("Pau-d'Arco"). */
export function normalizarNomeMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mesmoMunicipio(a: { nome: string; uf: string }, b: MunicipioDeclarado): boolean {
  return a.uf.trim().toUpperCase() === b.uf.trim().toUpperCase() && normalizarNomeMunicipio(a.nome) === normalizarNomeMunicipio(b.municipio);
}

/**
 * Talhão na divisa é aceito se tiver alguma área (≥ 1 m²) no município declarado. Se não tiver,
 * informa o município onde está a maior parte dele.
 */
export function conferirMunicipio(
  talhao: GeometriaTalhao,
  declarado: MunicipioDeclarado,
  limites: LimiteMunicipio[],
): ConferenciaMunicipio {
  const tocados: { limite: LimiteMunicipio; areaHa: number }[] = [];
  for (const limite of limites) {
    const inter = intersect(
      featureCollection([
        { type: "Feature", properties: {}, geometry: talhao },
        { type: "Feature", properties: {}, geometry: limite.geometria },
      ]),
    );
    const areaHa = inter ? calcularAreaHa(inter.geometry) : 0;
    if (areaHa >= AREA_MINIMA_SOBREPOSICAO_HA) tocados.push({ limite, areaHa });
  }
  if (tocados.length === 0) return { situacao: "desconhecido" };
  if (tocados.some((t) => mesmoMunicipio(t.limite, declarado))) return { situacao: "confere" };
  const principal = tocados.reduce((a, b) => (b.areaHa > a.areaHa ? b : a)).limite;
  return { situacao: "diverge", encontrado: { nome: principal.nome, uf: principal.uf } };
}

/** Mensagem do bloqueio, para a análise e para a emissão do dossiê. */
export function mensagemMunicipioDivergente(
  encontrado: { nome: string; uf: string },
  declarado: MunicipioDeclarado,
  acao: "analise" | "dossie",
): string {
  const motivo =
    acao === "analise"
      ? "Por isso o risco não foi calculado"
      : "Por isso o dossiê não foi gerado: ele mostraria ao comprador um município errado";
  return (
    `O talhão fica em ${encontrado.nome}/${encontrado.uf}, mas a propriedade está cadastrada em ` +
    `${declarado.municipio.trim()}/${declarado.uf.trim().toUpperCase()}. ${motivo}. Corrija o município ` +
    "da propriedade (botão Editar da propriedade) ou o desenho do talhão."
  );
}
