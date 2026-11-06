// Validação e área de talhões (RF05, RF06). Código puro: roda no servidor (autoridade)
// e no navegador (feedback imediato no mapa).
import { area } from "@turf/area";
import { bbox as calcularBbox } from "@turf/bbox";
import { kinks } from "@turf/kinks";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

export const AREA_MIN_HA = 0.1;
export const AREA_MAX_HA = 10_000;

export type GeometriaTalhao = Polygon | MultiPolygon;
export type Bbox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export type ResultadoValidacao =
  | { ok: true; geometria: GeometriaTalhao; areaHa: number; bbox: Bbox }
  | { ok: false; erro: string };

const M2_POR_HA = 10_000;

function falha(erro: string): ResultadoValidacao {
  return { ok: false, erro };
}

function ehPosicaoValida(p: unknown): p is Position {
  if (!Array.isArray(p) || p.length < 2) return false;
  const [lng, lat] = p;
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/** Valida um anel e devolve só [lng, lat] (descarta altitude) ou uma mensagem de erro. */
function normalizarAnel(anel: unknown): Position[] | string {
  if (!Array.isArray(anel)) return "Geometria inválida.";
  if (!anel.every(ehPosicaoValida)) {
    return "Coordenadas inválidas: use longitude/latitude em graus (WGS 84).";
  }
  if (anel.length < 4) return "O polígono precisa de pelo menos 3 vértices.";
  const primeiro = anel[0];
  const ultimo = anel[anel.length - 1];
  if (primeiro[0] !== ultimo[0] || primeiro[1] !== ultimo[1]) {
    return "O polígono não está fechado: o último ponto deve ser igual ao primeiro.";
  }
  return anel.map(([lng, lat]) => [lng, lat]);
}

function normalizarPoligono(coords: unknown): Position[][] | string {
  if (!Array.isArray(coords) || coords.length === 0) return "Geometria inválida.";
  const aneis: Position[][] = [];
  for (const anel of coords) {
    const r = normalizarAnel(anel);
    if (typeof r === "string") return r;
    aneis.push(r);
  }
  return aneis;
}

/**
 * Confere tipo (Polygon/MultiPolygon), coordenadas WGS 84 e anéis fechados; devolve a
 * geometria só com [lng, lat] ou uma mensagem de erro. Não checa área nem auto-interseção.
 */
export function normalizarGeometriaPoligonal(entrada: unknown): GeometriaTalhao | string {
  if (typeof entrada !== "object" || entrada === null) return "Geometria inválida.";
  const { type, coordinates } = entrada as { type?: unknown; coordinates?: unknown };

  if (type === "Polygon") {
    const r = normalizarPoligono(coordinates);
    return typeof r === "string" ? r : { type: "Polygon", coordinates: r };
  }
  if (type === "MultiPolygon") {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return "Geometria inválida.";
    const poligonos: Position[][][] = [];
    for (const p of coordinates) {
      const r = normalizarPoligono(p);
      if (typeof r === "string") return r;
      poligonos.push(r);
    }
    return { type: "MultiPolygon", coordinates: poligonos };
  }
  return "O talhão deve ser um polígono (Polygon ou MultiPolygon).";
}

/** Área geodésica em hectares. */
export function calcularAreaHa(geometria: GeometriaTalhao): number {
  return area(geometria) / M2_POR_HA;
}

/**
 * Valida a geometria de um talhão (fechada, sem auto-interseção, área entre 0,1 e
 * 10.000 ha) e devolve a geometria normalizada (2D), a área em hectares e o bbox.
 */
export function validarGeometriaTalhao(entrada: unknown): ResultadoValidacao {
  const geometria = normalizarGeometriaPoligonal(entrada);
  if (typeof geometria === "string") return falha(geometria);

  const feature: Feature<GeometriaTalhao> = { type: "Feature", properties: {}, geometry: geometria };
  if (kinks(feature).features.length > 0) {
    return falha("O polígono se cruza (auto-interseção). Redesenhe sem cruzar as linhas.");
  }

  const areaHa = calcularAreaHa(geometria);
  if (areaHa < AREA_MIN_HA) {
    return falha(`Área muito pequena: o mínimo é ${formatarHa(AREA_MIN_HA)}.`);
  }
  if (areaHa > AREA_MAX_HA) {
    return falha(`Área muito grande: o máximo é ${formatarHa(AREA_MAX_HA)}.`);
  }

  const [minLng, minLat, maxLng, maxLat] = calcularBbox(geometria);
  return { ok: true, geometria, areaHa, bbox: [minLng, minLat, maxLng, maxLat] };
}

const formatoHa = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatarHa(valor: number): string {
  // Áreas pequenas (ex.: sobreposição de poucos m²) não podem aparecer como "0 ha".
  if (valor > 0 && valor < 0.01) return "< 0,01 ha";
  return `${formatoHa.format(valor)} ha`;
}

/**
 * Centroide (RF15) ponderado pela área de cada anel, em [lng, lat]. Usa projeção plana local,
 * suficiente para talhões (até 10.000 ha); buracos entram com área negativa.
 */
export function calcularCentroide(geometria: GeometriaTalhao): Position {
  const poligonos = geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;
  const [lng0, lat0] = poligonos[0][0][0];
  const k = Math.cos((lat0 * Math.PI) / 180);
  let somaA = 0;
  let somaX = 0;
  let somaY = 0;
  for (const aneis of poligonos) {
    aneis.forEach((anel, i) => {
      let a = 0;
      let cx = 0;
      let cy = 0;
      for (let j = 0; j < anel.length - 1; j++) {
        const x1 = (anel[j][0] - lng0) * k;
        const y1 = anel[j][1] - lat0;
        const x2 = (anel[j + 1][0] - lng0) * k;
        const y2 = anel[j + 1][1] - lat0;
        const cruz = x1 * y2 - x2 * y1;
        a += cruz;
        cx += (x1 + x2) * cruz;
        cy += (y1 + y2) * cruz;
      }
      // Anel externo conta positivo e buracos negativo, qualquer que seja o sentido de giro.
      const sinal = (i === 0 ? 1 : -1) * Math.sign(a);
      somaA += sinal * a;
      somaX += sinal * cx;
      somaY += sinal * cy;
    });
  }
  if (somaA === 0) return [lng0, lat0];
  return [lng0 + somaX / (3 * somaA) / k, lat0 + somaY / (3 * somaA)];
}
