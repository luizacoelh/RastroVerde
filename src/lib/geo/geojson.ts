// Leitura de arquivos GeoJSON (RFC 7946): talhão importado (US05) e base de alertas (US13).
import type { GeoJsonProperties } from "geojson";
import { validarGeometriaTalhao, type GeometriaTalhao } from "./talhao";

export type Feicao = { geometria: unknown; propriedades: GeoJsonProperties };

/** Tamanho máximo do arquivo de talhão (RF07). */
export const TAMANHO_MAX_ARQUIVO_TALHAO = 1024 * 1024;

const TIPOS_POLIGONO = new Set(["Polygon", "MultiPolygon"]);

/**
 * Sistemas aceitos no membro "crs" (GeoJSON antigo, ainda exportado pelo QGIS).
 * O RFC 7946 só admite WGS 84; qualquer outro indica coordenadas projetadas (ex.: UTM).
 */
const CRS_WGS84 = /(CRS84|EPSG::?4326|EPSG::?4674)$/i;

/** Lista as feições de um FeatureCollection, Feature ou Geometry, ou devolve um erro. */
export function listarFeicoes(entrada: unknown): Feicao[] | string {
  if (typeof entrada !== "object" || entrada === null) return "O arquivo não é um GeoJSON válido.";
  const objeto = entrada as {
    type?: unknown;
    features?: unknown;
    geometry?: unknown;
    properties?: unknown;
    crs?: { properties?: { name?: unknown } };
  };

  const nomeCrs = objeto.crs?.properties?.name;
  if (typeof nomeCrs === "string" && !CRS_WGS84.test(nomeCrs)) {
    return `O arquivo está em outro sistema de coordenadas (${nomeCrs}). Exporte em WGS 84 (EPSG:4326).`;
  }

  if (objeto.type === "FeatureCollection") {
    if (!Array.isArray(objeto.features)) return "O arquivo não é um GeoJSON válido.";
    return objeto.features.map((f: { geometry?: unknown; properties?: GeoJsonProperties }) => ({
      geometria: f?.geometry ?? null,
      propriedades: f?.properties ?? null,
    }));
  }
  if (objeto.type === "Feature") {
    return [{ geometria: objeto.geometry ?? null, propriedades: (objeto.properties as GeoJsonProperties) ?? null }];
  }
  if (typeof objeto.type === "string") return [{ geometria: objeto, propriedades: null }];
  return "O arquivo não é um GeoJSON válido.";
}

export function ehPoligonal(geometria: unknown): boolean {
  return (
    typeof geometria === "object" &&
    geometria !== null &&
    TIPOS_POLIGONO.has((geometria as { type?: unknown }).type as string)
  );
}

export type ResultadoImportacaoTalhao = { ok: true; geometria: GeometriaTalhao; areaHa: number } | { ok: false; erro: string };

/** Lê o texto de um arquivo GeoJSON com um único talhão (Polygon ou MultiPolygon) — RF07. */
export function lerTalhaoGeoJSON(texto: string): ResultadoImportacaoTalhao {
  let entrada: unknown;
  try {
    entrada = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "O arquivo não é um GeoJSON válido." };
  }
  const feicoes = listarFeicoes(entrada);
  if (typeof feicoes === "string") return { ok: false, erro: feicoes };

  const poligonos = feicoes.filter((f) => ehPoligonal(f.geometria));
  if (poligonos.length === 0) {
    return { ok: false, erro: "O arquivo não tem nenhum polígono (Polygon ou MultiPolygon)." };
  }
  if (poligonos.length > 1) {
    return { ok: false, erro: `O arquivo tem ${poligonos.length} polígonos. Importe um talhão por vez.` };
  }

  const validacao = validarGeometriaTalhao(poligonos[0].geometria);
  if (!validacao.ok) return { ok: false, erro: validacao.erro };
  return { ok: true, geometria: validacao.geometria, areaHa: validacao.areaHa };
}
