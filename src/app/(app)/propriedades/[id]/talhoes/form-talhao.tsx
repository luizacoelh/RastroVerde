"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import { EditorTalhao } from "@/components/mapa/editor-talhao";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { formatarHa, validarGeometriaTalhao, type GeometriaTalhao } from "@/lib/geo/talhao";
import type { EstadoFormulario } from "@/lib/validacao";

export function FormTalhao({
  acao,
  nomeInicial = "",
  geometriaInicial,
  outros,
  voltarPara,
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  nomeInicial?: string;
  geometriaInicial?: GeometriaTalhao;
  outros: FeatureCollection;
  voltarPara: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  // Campos controlados: o mapa não pode ser remontado após um erro do servidor.
  const [nome, setNome] = useState(nomeInicial);
  const [geometria, setGeometria] = useState<GeometriaTalhao | null>(geometriaInicial ?? null);

  const validacao = useMemo(() => (geometria ? validarGeometriaTalhao(geometria) : null), [geometria]);

  function aoMudarNoMapa(nova: Polygon | null) {
    // Um MultiPolygon salvo (não editável no mapa) continua valendo até o usuário desenhar outro.
    setGeometria((atual) =>
      nova === null && atual?.type === "MultiPolygon" && atual === geometriaInicial ? atual : nova,
    );
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

      <EditorTalhao inicial={geometriaInicial} outros={outros} onChange={aoMudarNoMapa} />

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
