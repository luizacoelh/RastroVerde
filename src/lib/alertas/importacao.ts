// Preparação da base de alertas para importação (US13, RF19). Código puro, usado pelo
// script scripts/importar-alertas.ts.
import { bbox as calcularBbox } from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import { kinks } from "@turf/kinks";
import { union } from "@turf/union";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { ehPoligonal, listarFeicoes } from "@/lib/geo/geojson";
import { normalizarGeometriaPoligonal, type Bbox, type GeometriaTalhao } from "@/lib/geo/talhao";

export type OpcoesAlertas = {
  /** Propriedade com a data de detecção (MapBiomas Alerta: DATADETEC). */
  campoData: string;
  /** Propriedade com o código do alerta na fonte (MapBiomas Alerta: CODEALERTA). */
  campoCodigo?: string;
};

export type AlertaPreparado = {
  codigoFonte: string | null;
  geometria: GeometriaTalhao;
  dataDeteccao: Date;
  bbox: Bbox;
};

export type Descarte = { posicao: number; motivo: string };

function dataUtcValida(ano: number, mes: number, dia: number): Date | null {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  if (ano < 1985 || ano > 2100) return null;
  return data;
}

/**
 * Lê a data de detecção como data (sem hora, em UTC). Aceita "2023-05-10",
 * "2023-05-10T00:00:00Z", "2023/05/10", "20230510" e "10/05/2023".
 */
export function lerDataDeteccao(valor: unknown): Date | null {
  if (typeof valor === "number" && Number.isInteger(valor)) valor = String(valor);
  if (typeof valor !== "string") return null;
  const texto = valor.trim();

  let m = texto.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T ].*)?$/);
  if (m) return dataUtcValida(Number(m[1]), Number(m[2]), Number(m[3]));
  m = texto.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return dataUtcValida(Number(m[1]), Number(m[2]), Number(m[3]));
  m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return dataUtcValida(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

/** Valida e normaliza os alertas de um GeoJSON; feições inválidas são descartadas com motivo. */
export function prepararAlertas(
  entrada: unknown,
  opcoes: OpcoesAlertas,
): { alertas: AlertaPreparado[]; descartados: Descarte[] } | string {
  const feicoes = listarFeicoes(entrada);
  if (typeof feicoes === "string") return feicoes;

  const alertas: AlertaPreparado[] = [];
  const descartados: Descarte[] = [];

  feicoes.forEach((feicao, posicao) => {
    const descartar = (motivo: string) => descartados.push({ posicao, motivo });
    if (!ehPoligonal(feicao.geometria)) return descartar("geometria não é Polygon/MultiPolygon");

    const geometria = normalizarGeometriaPoligonal(feicao.geometria);
    if (typeof geometria === "string") return descartar(geometria);
    const feature: Feature<GeometriaTalhao> = { type: "Feature", properties: {}, geometry: geometria };
    if (kinks(feature).features.length > 0) return descartar("polígono com auto-interseção");

    const dataDeteccao = lerDataDeteccao(feicao.propriedades?.[opcoes.campoData]);
    if (!dataDeteccao) return descartar(`data inválida ou ausente no campo "${opcoes.campoData}"`);

    const codigo = opcoes.campoCodigo ? feicao.propriedades?.[opcoes.campoCodigo] : undefined;
    const [minLng, minLat, maxLng, maxLat] = calcularBbox(geometria);
    alertas.push({
      codigoFonte: codigo === undefined || codigo === null || codigo === "" ? null : String(codigo),
      geometria,
      dataDeteccao,
      bbox: [minLng, minLat, maxLng, maxLat],
    });
  });

  return { alertas, descartados };
}

/**
 * Une os polígonos da área de cobertura (ex.: limites dos municípios do recorte, IBGE)
 * em uma única geometria.
 */
export function prepararCobertura(entrada: unknown): { geometria: GeometriaTalhao; bbox: Bbox } | string {
  const feicoes = listarFeicoes(entrada);
  if (typeof feicoes === "string") return feicoes;

  const poligonos: Feature<Polygon | MultiPolygon>[] = [];
  for (const feicao of feicoes) {
    if (!ehPoligonal(feicao.geometria)) continue;
    const geometria = normalizarGeometriaPoligonal(feicao.geometria);
    if (typeof geometria === "string") return `Cobertura inválida: ${geometria}`;
    poligonos.push({ type: "Feature", properties: {}, geometry: geometria });
  }
  if (poligonos.length === 0) return "A cobertura não tem nenhum polígono.";

  const unida = poligonos.length === 1 ? poligonos[0] : union(featureCollection(poligonos));
  if (!unida) return "Não foi possível unir os polígonos da cobertura.";
  const [minLng, minLat, maxLng, maxLat] = calcularBbox(unida);
  return { geometria: unida.geometry, bbox: [minLng, minLat, maxLng, maxLat] };
}
