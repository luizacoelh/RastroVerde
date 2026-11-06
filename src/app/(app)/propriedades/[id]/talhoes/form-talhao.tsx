"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import { EditorTalhao, type PropsEditorTalhao } from "@/components/mapa/editor-talhao";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { TAMANHO_MAX_ARQUIVO_TALHAO, lerTalhaoGeoJSON } from "@/lib/geo/geojson";
import { formatarHa, validarGeometriaTalhao, type GeometriaTalhao } from "@/lib/geo/talhao";
import type { EstadoFormulario } from "@/lib/validacao";

export function FormTalhao({
  acao,
  nomeInicial = "",
  geometriaInicial,
  outros,
  cobertura,
  voltarPara,
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  nomeInicial?: string;
  geometriaInicial?: GeometriaTalhao;
  outros: FeatureCollection;
  cobertura?: PropsEditorTalhao["cobertura"];
  voltarPara: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  // Campos controlados: o mapa não pode ser remontado após um erro do servidor.
  const [nome, setNome] = useState(nomeInicial);
  const [geometria, setGeometria] = useState<GeometriaTalhao | null>(geometriaInicial ?? null);
  // Geometria com que o editor monta; muda ao importar um arquivo (US05), remontando o mapa.
  const [base, setBase] = useState<{ geometria?: GeometriaTalhao; versao: number }>({
    geometria: geometriaInicial,
    versao: 0,
  });
  const [importacao, setImportacao] = useState<{ erro?: string; ok?: string }>({});
  const arquivo = useRef<HTMLInputElement>(null);

  const validacao = useMemo(() => (geometria ? validarGeometriaTalhao(geometria) : null), [geometria]);

  function aoMudarNoMapa(nova: Polygon | null) {
    // Um MultiPolygon salvo (não editável no mapa) continua valendo até o usuário desenhar outro.
    setGeometria((atual) =>
      nova === null && atual?.type === "MultiPolygon" && atual === base.geometria ? atual : nova,
    );
  }

  async function importarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return;
    if (escolhido.size > TAMANHO_MAX_ARQUIVO_TALHAO) {
      setImportacao({ erro: "O arquivo passa de 1 MB. Simplifique o polígono ou exporte só o talhão." });
      return;
    }
    const lido = lerTalhaoGeoJSON(await escolhido.text());
    if (!lido.ok) {
      setImportacao({ erro: `Não foi possível importar ${escolhido.name}: ${lido.erro}` });
      return;
    }
    setGeometria(lido.geometria);
    setBase((b) => ({ geometria: lido.geometria, versao: b.versao + 1 }));
    setImportacao({ ok: `Importado ${escolhido.name} (${formatarHa(lido.areaHa)}). Confira no mapa antes de salvar.` });
  }

  const erroGeometria = estado.erros?.geometria?.[0] ?? (validacao && !validacao.ok ? validacao.erro : null);

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.mensagem ? <Aviso>{estado.mensagem}</Aviso> : null}

      <div className="max-w-md">
        <Campo
          rotulo="Nome do talhão"
          nome="nome"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Talhão 1 — Soja safra 25/26"
          erros={estado.erros?.nome}
        />
      </div>

      <input type="hidden" name="geometria" value={geometria ? JSON.stringify(geometria) : ""} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-stone-600">Já tem o polígono?</span>
        <button type="button" className={classeBotao.secundario} onClick={() => arquivo.current?.click()}>
          Importar GeoJSON
        </button>
        <input
          ref={arquivo}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          className="sr-only"
          aria-label="Arquivo GeoJSON do talhão"
          tabIndex={-1}
          onChange={importarArquivo}
        />
        <span className="text-xs text-stone-600">Polygon ou MultiPolygon em WGS 84, até 1 MB.</span>
      </div>
      {importacao.erro ? <Aviso>{importacao.erro}</Aviso> : null}
      {importacao.ok ? <Aviso tipo="info">{importacao.ok}</Aviso> : null}

      <EditorTalhao
        key={base.versao}
        inicial={base.geometria}
        outros={outros}
        cobertura={cobertura}
        onChange={aoMudarNoMapa}
      />

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4"
        aria-live="polite"
      >
        <div>
          <p className="text-sm text-stone-600">Área do talhão</p>
          <p className="text-2xl font-semibold">
            {validacao?.ok ? formatarHa(validacao.areaHa) : "—"}
          </p>
          {erroGeometria ? (
            <p role="alert" className="mt-1 text-sm font-medium text-red-700">
              {erroGeometria}
            </p>
          ) : !geometria ? (
            <p className="mt-1 text-sm text-stone-600">Desenhe o polígono no mapa.</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Link href={voltarPara} className={classeBotao.secundario}>
            Cancelar
          </Link>
          <button type="submit" className={classeBotao.primario} disabled={pendente || !validacao?.ok}>
            {pendente ? "Salvando…" : "Salvar talhão"}
          </button>
        </div>
      </div>
    </form>
  );
}
