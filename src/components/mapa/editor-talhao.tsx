"use client";

// Mapa com desenho de polígono (MapLibre GL + Terra Draw) — US04/US06.
// Mantém um único polígono: desenhar um novo substitui o anterior.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapaLibre } from "maplibre-gl";
import type { TerraDraw } from "terra-draw";
import type { FeatureCollection, Polygon } from "geojson";
import type { GeometriaTalhao } from "@/lib/geo/talhao";
import { classeBotao } from "@/components/ui";
import { COR_CONTORNO, COR_OUTROS, COR_TALHAO, adicionarCamadaTalhoes, criarMapa, enquadrar } from "./base";

type Modo = "carregando" | "desenhando" | "editando";

export type PropsEditorTalhao = {
  /** Geometria salva do talhão (edição). */
  inicial?: GeometriaTalhao;
  /** Outros talhões da propriedade, exibidos em cinza como referência. */
  outros: FeatureCollection;
  onChange: (geometria: Polygon | null) => void;
};

function poligonoAtual(draw: TerraDraw): Polygon | null {
  const feature = draw
    .getSnapshot()
    .find((f) => f.geometry.type === "Polygon" && f.properties.mode === "polygon" && !f.properties.currentlyDrawing);
  return feature ? (feature.geometry as Polygon) : null;
}

export function EditorTalhao({ inicial, outros, onChange }: PropsEditorTalhao) {
  const container = useRef<HTMLDivElement>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const onChangeRef = useRef(onChange);
  const [modo, setModo] = useState<Modo>("carregando");
  const [erroMapa, setErroMapa] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // O mapa é criado uma vez; `inicial` e `outros` só valem para a montagem.
  const inicialRef = useRef(inicial);
  const outrosRef = useRef(outros);

  useEffect(() => {
    let cancelado = false;
    let mapa: MapaLibre | undefined;

    (async () => {
      const [{ TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode }, { TerraDrawMapLibreGLAdapter }] =
        await Promise.all([import("terra-draw"), import("terra-draw-maplibre-gl-adapter")]);
      if (cancelado || !container.current) return;

      mapa = await criarMapa(container.current);
      if (cancelado) {
        mapa.remove();
        return;
      }
      const m = mapa;
      m.on("error", (e) => {
        // Falha ao carregar tiles não impede o desenho; avisa só uma vez.
        if (!cancelado && String(e.error?.message ?? "").includes("tile")) setErroMapa(true);
      });

      m.on("load", () => {
        if (cancelado) return;
        const inicialGeo = inicialRef.current;
        const outrosGeo = outrosRef.current;

        adicionarCamadaTalhoes(m, "outros", outrosGeo, COR_OUTROS, 0.15);
        // MultiPolygon (importado) não é editável no Terra Draw: mostra como referência.
        if (inicialGeo?.type === "MultiPolygon") {
          adicionarCamadaTalhoes(
            m,
            "atual",
            { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: inicialGeo }] },
            COR_TALHAO,
          );
        }

        const draw = new TerraDraw({
          adapter: new TerraDrawMapLibreGLAdapter({ map: m }),
          modes: [
            new TerraDrawPolygonMode({
              styles: {
                fillColor: COR_TALHAO,
                fillOpacity: 0.3,
                outlineColor: COR_CONTORNO,
                outlineWidth: 2,
                closingPointColor: COR_CONTORNO,
              },
            }),
            new TerraDrawSelectMode({
              allowManualDeselection: false,
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    coordinates: { midpoints: true, draggable: true, deletable: true },
                  },
                },
              },
              styles: {
                selectedPolygonColor: COR_TALHAO,
                selectedPolygonFillOpacity: 0.3,
                selectedPolygonOutlineColor: COR_CONTORNO,
                selectedPolygonOutlineWidth: 2,
                selectionPointColor: COR_CONTORNO,
                midPointColor: COR_TALHAO,
              },
            }),
          ],
        });
        drawRef.current = draw;
        draw.start();

        const emitir = () => onChangeRef.current(poligonoAtual(draw));

        draw.on("change", emitir);
        draw.on("finish", (id, contexto) => {
          if (contexto.mode === "polygon" && contexto.action === "draw") {
            // Um talhão = um polígono: remove o anterior e passa para edição de vértices.
            const anteriores = draw
              .getSnapshot()
              .filter((f) => f.id !== id)
              .map((f) => f.id)
              .filter((fid): fid is string | number => fid !== undefined);
            if (anteriores.length) draw.removeFeatures(anteriores);
            draw.setMode("select");
            draw.selectFeature(id);
            setModo("editando");
          }
          emitir();
        });

        const enquadramento: FeatureCollection = {
          type: "FeatureCollection",
          features: [...outrosGeo.features],
        };

        if (inicialGeo?.type === "Polygon") {
          const id = crypto.randomUUID();
          draw.addFeatures([{ id, type: "Feature", geometry: inicialGeo, properties: { mode: "polygon" } }]);
          draw.setMode("select");
          draw.selectFeature(id);
          setModo("editando");
          enquadramento.features.push({ type: "Feature", properties: {}, geometry: inicialGeo });
        } else {
          if (inicialGeo) enquadramento.features.push({ type: "Feature", properties: {}, geometry: inicialGeo });
          draw.setMode("polygon");
          setModo("desenhando");
        }
        enquadrar(m, enquadramento);
        emitir();
      });
    })();

    return () => {
      cancelado = true;
      drawRef.current?.stop();
      drawRef.current = null;
      mapa?.remove();
    };
  }, []);

  function redesenhar() {
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    draw.setMode("polygon");
    setModo("desenhando");
    onChangeRef.current(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-700" aria-live="polite">
          {modo === "carregando" && "Carregando mapa…"}
          {modo === "desenhando" &&
            "Aproxime o mapa até a área e clique para marcar cada vértice. Para fechar, clique no primeiro ponto."}
          {modo === "editando" &&
            "Arraste os vértices para ajustar. Clique no ponto do meio de um lado para criar um vértice."}
        </p>
        {modo === "editando" ? (
          <button type="button" onClick={redesenhar} className={classeBotao.secundario}>
            Redesenhar
          </button>
        ) : null}
      </div>
      <div
        ref={container}
        className="h-[60vh] min-h-80 w-full overflow-hidden rounded-lg border border-stone-300 bg-stone-200"
        role="application"
        aria-label="Mapa para desenhar o talhão"
      />
      {erroMapa ? (
        <p className="text-xs text-amber-800">
          Algumas partes do mapa de fundo não carregaram. Verifique sua conexão.
        </p>
      ) : null}
    </div>
  );
}
