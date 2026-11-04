import type { FeatureCollection } from "geojson";
import type { GeometriaTalhao } from "./talhao";

/** Converte talhões em FeatureCollection para exibir no mapa. */
export function colecaoDeTalhoes(
  talhoes: { id: string; nome: string; geometria: GeometriaTalhao }[],
): FeatureCollection<GeometriaTalhao, { id: string; nome: string }> {
  return {
    type: "FeatureCollection",
    features: talhoes.map((t) => ({
      type: "Feature",
      properties: { id: t.id, nome: t.nome },
      geometry: t.geometria,
    })),
  };
}
