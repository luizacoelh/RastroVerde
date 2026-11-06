"use client";

// Mapa com desenho de polígono (MapLibre GL + Terra Draw) — US04/US06.
// Mantém um único polígono: desenhar um novo substitui o anterior.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapaLibre } from "maplibre-gl";
import type { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import type { FeatureCollection, Polygon } from "geojson";
import { calcularAreaHa, formatarHa, type GeometriaTalhao } from "@/lib/geo/talhao";
import { classeBotao } from "@/components/ui";
import {
  COR_COBERTURA,
  COR_CONTORNO,
  COR_OUTROS,
  COR_TALHAO,
  adicionarCamadaTalhoes,
  carregarMapLibre,
  criarMapa,
  enquadrar,
} from "./base";

type Modo = "carregando" | "desenhando" | "editando";

/** Estado do polígono que está sendo desenhado (antes de fechar). */
type Rascunho = { pontos: number; areaHa: number | null };

const SEM_RASCUNHO: Rascunho = { pontos: 0, areaHa: null };

export type PropsEditorTalhao = {
  /** Geometria salva do talhão (edição). */
  inicial?: GeometriaTalhao;
  /** Outros talhões da propriedade, exibidos em cinza como referência. */
  outros: FeatureCollection;
  /** Área coberta pelas bases de alertas (UC4), em azul tracejado; fora dela não há análise. */
  cobertura?: { colecao: FeatureCollection; descricoes: string[] };
  onChange: (geometria: Polygon | null) => void;
};

function poligonoAtual(draw: TerraDraw): Polygon | null {
  const feature = draw
    .getSnapshot()
    .find((f) => f.geometry.type === "Polygon" && f.properties.mode === "polygon" && !f.properties.currentlyDrawing);
  return feature ? (feature.geometry as Polygon) : null;
}

/**
 * Lê o polígono em desenho. O Terra Draw guarda uma LineString até o 3º vértice e depois
 * um Polygon cujo anel inclui a posição do cursor; a área acompanha o cursor.
 */
function lerRascunho(draw: TerraDraw): Rascunho {
  const feature = draw.getSnapshot().find((f) => f.properties.mode === "polygon" && f.properties.currentlyDrawing);
  if (!feature) return SEM_RASCUNHO;
  if (feature.geometry.type === "LineString") {
    return { pontos: Math.max(feature.geometry.coordinates.length - 1, 0), areaHa: null };
  }
  if (feature.geometry.type === "Polygon") {
    const anel = feature.geometry.coordinates[0] ?? [];
    return { pontos: Math.max(anel.length - 2, 0), areaHa: calcularAreaHa(feature.geometry as Polygon) };
  }
  return SEM_RASCUNHO;
}

export function EditorTalhao({ inicial, outros, cobertura, onChange }: PropsEditorTalhao) {
  const container = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLibre | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const modoPoligonoRef = useRef<TerraDrawPolygonMode | null>(null);
  const onChangeRef = useRef(onChange);
  const [modo, setModo] = useState<Modo>("carregando");
  const [rascunho, setRascunho] = useState<Rascunho>(SEM_RASCUNHO);
  const [erroMapa, setErroMapa] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // O mapa é criado uma vez; `inicial` e `outros` só valem para a montagem.
  const inicialRef = useRef(inicial);
  const outrosRef = useRef(outros);
  const coberturaRef = useRef(cobertura);

  useEffect(() => {
    let cancelado = false;
    let mapa: MapaLibre | undefined;

    (async () => {
      const [maplibre, { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode }, { TerraDrawMapLibreGLAdapter }] =
        await Promise.all([carregarMapLibre(), import("terra-draw"), import("terra-draw-maplibre-gl-adapter")]);
      // Strict Mode monta o efeito duas vezes: o primeiro já foi limpo e não cria mapa.
      if (cancelado || !container.current) return;

      const m = criarMapa(maplibre, container.current);
      mapa = m;
      mapaRef.current = m;
      m.on("error", (e) => {
        // Falha ao carregar tiles não impede o desenho; avisa só uma vez.
        if (!cancelado && String(e.error?.message ?? "").includes("tile")) setErroMapa(true);
      });

      // "style.load" e não "load": o "load" espera todos os tiles do fundo, e um tile lento
      // do OSM deixaria o editor travado em "Carregando mapa…".
      m.once("style.load", () => {
        if (cancelado) return;
        const inicialGeo = inicialRef.current;
        const outrosGeo = outrosRef.current;

        // Por baixo de tudo, só como referência: a área onde a análise funciona.
        const coberturaGeo = coberturaRef.current?.colecao;
        if (coberturaGeo?.features.length) {
          adicionarCamadaTalhoes(m, "cobertura", coberturaGeo, COR_COBERTURA, 0.04, {
            larguraContorno: 2,
            tracejado: true,
          });
        }
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

        const modoPoligono = new TerraDrawPolygonMode({
          // Mostra cada vértice já marcado, não só o primeiro e o último.
          showCoordinatePoints: true,
          keyEvents: { cancel: "Escape", finish: "Enter" },
          styles: {
            fillColor: COR_TALHAO,
            fillOpacity: 0.3,
            outlineColor: COR_CONTORNO,
            outlineWidth: 3,
            coordinatePointColor: COR_CONTORNO,
            coordinatePointWidth: 5,
            coordinatePointOutlineColor: "#ffffff",
            coordinatePointOutlineWidth: 2,
            // Primeiro e último ponto: clicar em um deles fecha o polígono.
            closingPointColor: "#facc15",
            closingPointWidth: 7,
            closingPointOutlineColor: COR_CONTORNO,
            closingPointOutlineWidth: 2,
          },
        });
        modoPoligonoRef.current = modoPoligono;

        const draw = new TerraDraw({
          adapter: new TerraDrawMapLibreGLAdapter({ map: m }),
          modes: [
            modoPoligono,
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
                selectedPolygonOutlineWidth: 3,
                selectionPointColor: COR_CONTORNO,
                selectionPointWidth: 6,
                selectionPointOutlineColor: "#ffffff",
                selectionPointOutlineWidth: 2,
                midPointColor: COR_TALHAO,
                midPointWidth: 4,
              },
            }),
          ],
        });
        drawRef.current = draw;
        draw.start();

        const emitir = () => onChangeRef.current(poligonoAtual(draw));

        draw.on("change", () => {
          setRascunho(draw.getMode() === "polygon" ? lerRascunho(draw) : SEM_RASCUNHO);
          emitir();
        });
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
            setRascunho(SEM_RASCUNHO);
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
      modoPoligonoRef.current = null;
      mapa?.remove();
      mapaRef.current = null;
    };
  }, []);

  function verAreaCoberta() {
    const m = mapaRef.current;
    if (m && cobertura?.colecao.features.length) enquadrar(m, cobertura.colecao);
  }

  function redesenhar() {
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    draw.setMode("polygon");
    setModo("desenhando");
    setRascunho(SEM_RASCUNHO);
    onChangeRef.current(null);
  }

  function desfazerPonto() {
    modoPoligonoRef.current?.undo();
    const draw = drawRef.current;
    if (draw) setRascunho(lerRascunho(draw));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-stone-700" aria-live="polite">
          {modo === "carregando" && <p>Carregando mapa…</p>}
          {modo === "desenhando" && (
            <>
              <p>
                Clique para marcar os cantos do talhão. Clique no primeiro ponto ou dê dois cliques para fechar.
              </p>
              <p className="text-stone-600">
                Esc cancela o desenho.
                {rascunho.pontos > 0 ? ` Pontos marcados: ${rascunho.pontos}.` : ""}
                {rascunho.areaHa !== null ? (
                  <>
                    {" "}
                    Área: <strong data-testid="area-rascunho">{formatarHa(rascunho.areaHa)}</strong>
                  </>
                ) : null}
              </p>
            </>
          )}
          {modo === "editando" && (
            <p>Arraste os vértices para ajustar. Clique no ponto do meio de um lado para criar um vértice.</p>
          )}
        </div>
        {modo === "desenhando" ? (
          <button
            type="button"
            onClick={desfazerPonto}
            className={classeBotao.secundario}
            disabled={rascunho.pontos === 0}
          >
            Desfazer último ponto
          </button>
        ) : null}
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
      {cobertura?.colecao.features.length ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-4 border-2 border-dashed border-blue-700 bg-blue-700/5" />
            Área coberta pela base de alertas
            {cobertura.descricoes.length ? ` (${cobertura.descricoes.join("; ")})` : ""}. Talhões fora dela ficam sem
            análise.
          </span>
          <button type="button" onClick={verAreaCoberta} className="font-semibold text-green-800 hover:underline">
            Ver área coberta
          </button>
        </div>
      ) : null}
      {erroMapa ? (
        <p className="text-xs text-amber-800">
          Algumas partes do mapa de fundo não carregaram. Verifique sua conexão.
        </p>
      ) : null}
    </div>
  );
}
