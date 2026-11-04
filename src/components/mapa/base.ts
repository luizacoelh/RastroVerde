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

export async function criarMapa(container: HTMLElement) {
  const { Map, NavigationControl, GeolocateControl, ScaleControl } = await import("maplibre-gl");
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
