// Análise de desmatamento do talhão (US07/US08): interseção com alertas pós-31/12/2020
// (RN01, RF09), classificação de risco (RF10) e cobertura da base (UC4).
// Código puro: o acesso ao banco fica em src/lib/dados/analises.ts.
import { difference } from "@turf/difference";
import { featureCollection } from "@turf/helpers";
import { intersect } from "@turf/intersect";
import { union } from "@turf/union";
import type { Feature, FeatureCollection } from "geojson";
import { calcularAreaHa, type GeometriaTalhao } from "./talhao";

/** RN01 — data de corte do EUDR. Só contam alertas detectados depois dela. */
export const DATA_CORTE_EUDR = new Date(Date.UTC(2020, 11, 31));

/** RF10 — "Atenção" exige sobreposição abaixo dos dois limites. */
export const LIMITE_ATENCAO_PERCENTUAL = 1;
export const LIMITE_ATENCAO_HA = 0.5;

/**
 * Sobreposições menores que 1 m² são ruído numérico (ex.: alerta que só encosta na borda
 * do talhão) e não contam.
 */
export const AREA_MINIMA_SOBREPOSICAO_HA = 0.0001;

/** Parte do talhão que pode ficar fora da cobertura por arredondamento das bordas (0,1%). */
const TOLERANCIA_COBERTURA = 0.001;

export type Risco = "BAIXO" | "ATENCAO" | "ALTO";

export const ROTULO_RISCO: Record<Risco, string> = {
  BAIXO: "Baixo",
  ATENCAO: "Atenção",
  ALTO: "Alto",
};

export type AlertaParaAnalise = {
  codigo: string | null;
  dataDeteccao: Date;
  geometria: GeometriaTalhao;
};

export type PropriedadesSobreposicao = {
  codigo: string | null;
  /** AAAA-MM-DD */
  dataDeteccao: string;
  areaHa: number;
};

export type Sobreposicao = FeatureCollection<GeometriaTalhao, PropriedadesSobreposicao>;

export type ResultadoAnalise = {
  areaTalhaoHa: number;
  areaSobrepostaHa: number;
  /** 0–100 */
  percentual: number;
  risco: Risco;
  sobreposicao: Sobreposicao;
};

function feature(geometria: GeometriaTalhao): Feature<GeometriaTalhao> {
  return { type: "Feature", properties: {}, geometry: geometria };
}

/** RF10: Baixo sem sobreposição; Atenção se < 1% da área e < 0,5 ha; Alto nos demais casos. */
export function classificarRisco(areaSobrepostaHa: number, percentual: number): Risco {
  if (areaSobrepostaHa < AREA_MINIMA_SOBREPOSICAO_HA) return "BAIXO";
  if (percentual < LIMITE_ATENCAO_PERCENTUAL && areaSobrepostaHa < LIMITE_ATENCAO_HA) return "ATENCAO";
  return "ALTO";
}

/** UC4: o talhão precisa estar dentro da área coberta pela base; senão é "região sem dados". */
export function talhaoCoberto(talhao: GeometriaTalhao, cobertura: GeometriaTalhao): boolean {
  const fora = difference(featureCollection([feature(talhao), feature(cobertura)]));
  if (!fora) return true;
  return calcularAreaHa(fora.geometry) <= calcularAreaHa(talhao) * TOLERANCIA_COBERTURA;
}

function dataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * RF09: interseção do talhão com cada alerta posterior à data de corte. A área total é a
 * da união das interseções, para não contar duas vezes alertas que se sobrepõem.
 */
export function analisarSobreposicao(talhao: GeometriaTalhao, alertas: AlertaParaAnalise[]): ResultadoAnalise {
  const areaTalhaoHa = calcularAreaHa(talhao);
  const pedacos: Feature<GeometriaTalhao, PropriedadesSobreposicao>[] = [];

  for (const alerta of alertas) {
    if (alerta.dataDeteccao.getTime() <= DATA_CORTE_EUDR.getTime()) continue; // RN01
    const inter = intersect(featureCollection([feature(talhao), feature(alerta.geometria)]));
    if (!inter) continue;
    const areaHa = calcularAreaHa(inter.geometry);
    if (areaHa < AREA_MINIMA_SOBREPOSICAO_HA) continue;
    pedacos.push({
      type: "Feature",
      geometry: inter.geometry,
      properties: { codigo: alerta.codigo, dataDeteccao: dataIso(alerta.dataDeteccao), areaHa },
    });
  }

  let areaSobrepostaHa = 0;
  if (pedacos.length === 1) {
    areaSobrepostaHa = pedacos[0].properties.areaHa;
  } else if (pedacos.length > 1) {
    const unida = union(featureCollection(pedacos.map((p) => feature(p.geometry))));
    areaSobrepostaHa = unida ? calcularAreaHa(unida.geometry) : 0;
  }

  const percentual = areaTalhaoHa > 0 ? (areaSobrepostaHa / areaTalhaoHa) * 100 : 0;
  pedacos.sort((a, b) => b.properties.areaHa - a.properties.areaHa);
  return {
    areaTalhaoHa,
    areaSobrepostaHa,
    percentual,
    risco: classificarRisco(areaSobrepostaHa, percentual),
    sobreposicao: { type: "FeatureCollection", features: pedacos },
  };
}

const formatoPercentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatarPercentual(valor: number): string {
  if (valor > 0 && valor < 0.01) return "< 0,01%";
  return `${formatoPercentual.format(valor)}%`;
}
