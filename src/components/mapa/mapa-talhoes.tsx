"use client";

// Mapa somente leitura com os talhões de uma propriedade.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MapaLibre } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { COR_TALHAO, adicionarCamadaTalhoes, carregarMapLibre, criarMapa, enquadrar } from "./base";

export function MapaTalhoes({ talhoes }: { talhoes: FeatureCollection }) {
  const container = useRef<HTMLDivElement>(null);
  const dados = useRef(talhoes);

  useEffect(() => {
    dados.current = talhoes;
  }, [talhoes]);

  useEffect(() => {
    let cancelado = false;
    let mapa: MapaLibre | undefined;
    (async () => {
      const maplibre = await carregarMapLibre();
      // Strict Mode monta o efeito duas vezes: o primeiro já foi limpo e não cria mapa.
      if (cancelado || !container.current) return;
      const m = criarMapa(maplibre, container.current);
      mapa = m;
      // "style.load" não espera os tiles do fundo (um tile lento não esconde os talhões).
      m.once("style.load", () => {
        adicionarCamadaTalhoes(m, "talhoes", dados.current, COR_TALHAO, 0.3);
        enquadrar(m, dados.current);
      });
    })();
    return () => {
      cancelado = true;
      mapa?.remove();
    };
  }, []);

  return (
    <div
      ref={container}
      className="h-72 w-full overflow-hidden rounded-lg border border-stone-300 bg-stone-200"
      role="img"
      aria-label={`Mapa com ${talhoes.features.length} talhão(ões) da propriedade`}
    />
  );
}
