"use client";

// Mapa somente leitura com camadas de polígonos (talhões da propriedade, resultado da análise).
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MapaLibre } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { adicionarCamadaTalhoes, carregarMapLibre, criarMapa, enquadrar, type EstiloCamada } from "./base";

export type CamadaMapa = EstiloCamada & {
  id: string;
  colecao: FeatureCollection;
  cor: string;
  opacidade: number;
};

export function MapaLeitura({
  camadas,
  rotulo,
  enquadrarEm,
  className = "h-72",
}: {
  camadas: CamadaMapa[];
  /** Descrição do mapa para leitores de tela. */
  rotulo: string;
  /** Feições a enquadrar (padrão: todas as camadas). */
  enquadrarEm?: FeatureCollection;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const dados = useRef({ camadas, enquadrarEm });

  useEffect(() => {
    dados.current = { camadas, enquadrarEm };
  }, [camadas, enquadrarEm]);

  useEffect(() => {
    let cancelado = false;
    let mapa: MapaLibre | undefined;
    (async () => {
      const maplibre = await carregarMapLibre();
      // Strict Mode monta o efeito duas vezes: o primeiro já foi limpo e não cria mapa.
      if (cancelado || !container.current) return;
      const m = criarMapa(maplibre, container.current);
      mapa = m;
      // "style.load" não espera os tiles do fundo (um tile lento não esconde os polígonos).
      m.once("style.load", () => {
        const { camadas: cs, enquadrarEm: alvo } = dados.current;
        for (const { id, colecao, cor, opacidade, ...estilo } of cs) {
          adicionarCamadaTalhoes(m, id, colecao, cor, opacidade, estilo);
        }
        enquadrar(m, alvo ?? { type: "FeatureCollection", features: cs.flatMap((c) => c.colecao.features) });
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
      className={`w-full overflow-hidden rounded-lg border border-stone-300 bg-stone-200 ${className}`}
      role="img"
      aria-label={rotulo}
    />
  );
}
