// Configuração comum dos mapas (MapLibre GL). Tiles do OpenStreetMap (docs/04-arquitetura.md §4.2).
import type { Map as MapaLibre, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { bbox } from "@turf/bbox";

export const ESTILO_OSM: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Centro aproximado do Brasil, usado quando ainda não há talhão para enquadrar. */
export const CENTRO_BRASIL: [number, number] = [-51.9, -14.2];
export const ZOOM_BRASIL = 3.5;

export const TEXTOS_MAPA = {
  "NavigationControl.ZoomIn": "Aproximar",
  "NavigationControl.ZoomOut": "Afastar",
  "NavigationControl.ResetBearing": "Apontar para o norte",
  "GeolocateControl.FindMyLocation": "Minha localização",
  "GeolocateControl.LocationNotAvailable": "Localização indisponível",
};

export const COR_TALHAO = "#15803d";
export const COR_CONTORNO = "#14532d";
export const COR_OUTROS = "#57534e";

type ModuloMapLibre = typeof import("maplibre-gl");

/**
 * Caminho do worker do MapLibre, copiado de node_modules para public/ por
 * scripts/copiar-worker-maplibre.mjs. O MapLibre 6 procura o worker ao lado do próprio
 * arquivo (import.meta.url), que não existe no bundle do Turbopack ("Worker failed to load").
 */
export const URL_WORKER_MAPLIBRE = "/maplibre/maplibre-gl-worker.mjs";

let moduloMapLibre: Promise<ModuloMapLibre> | undefined;

/** Importa o MapLibre (só no navegador) e aponta o worker para o arquivo servido em public/. */
export function carregarMapLibre(): Promise<ModuloMapLibre> {
  moduloMapLibre ??= import("maplibre-gl").then((m) => {
    m.setWorkerUrl(`${URL_WORKER_MAPLIBRE}?v=${m.getVersion()}`);
    return m;
  });
  return moduloMapLibre;
}

/**
 * Cria o mapa de forma síncrona. Quem chama deve checar se o efeito foi cancelado
 * depois de `await carregarMapLibre()` e antes de chamar esta função; senão, no Strict
 * Mode, dois mapas disputam o mesmo container.
 */
export function criarMapa(maplibre: ModuloMapLibre, container: HTMLElement) {
  const { Map, NavigationControl, GeolocateControl, ScaleControl } = maplibre;
  const mapa = new Map({
    container,
    style: ESTILO_OSM,
    center: CENTRO_BRASIL,
    zoom: ZOOM_BRASIL,
    locale: TEXTOS_MAPA,
  });
  mapa.addControl(new NavigationControl({ showCompass: false }), "top-right");
  mapa.addControl(new GeolocateControl({ fitBoundsOptions: { maxZoom: 15 } }), "top-right");
  mapa.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
  return mapa;
}

export function enquadrar(mapa: MapaLibre, colecao: FeatureCollection) {
  if (colecao.features.length === 0) return;
  const [minLng, minLat, maxLng, maxLat] = bbox(colecao);
  mapa.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding: 40, maxZoom: 16, duration: 0 },
  );
}

/** Camadas somente leitura (preenchimento + contorno) para uma coleção de talhões. */
export function adicionarCamadaTalhoes(
  mapa: MapaLibre,
  id: string,
  colecao: FeatureCollection,
  cor: string,
  opacidade = 0.25,
) {
  mapa.addSource(id, { type: "geojson", data: colecao });
  mapa.addLayer({ id: `${id}-fill`, type: "fill", source: id, paint: { "fill-color": cor, "fill-opacity": opacidade } });
  mapa.addLayer({ id: `${id}-line`, type: "line", source: id, paint: { "line-color": cor, "line-width": 2 } });
}
