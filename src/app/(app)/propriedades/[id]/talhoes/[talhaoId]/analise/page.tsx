import type { Metadata } from "next";
import Link from "next/link";
import type { FeatureCollection } from "geojson";
import { MapaLeitura, type CamadaMapa } from "@/components/mapa/mapa-leitura";
import { COR_CONTORNO, COR_CONTORNO_SOBREPOSICAO, COR_SOBREPOSICAO } from "@/components/mapa/cores";
import { SeloRisco, Trilha, classeBotao } from "@/components/ui";
import { usuarioAtual } from "@/lib/dal";
import { contarAnalises, obterUltimaAnalise, temAnaliseObsoleta } from "@/lib/dados/analises";
import { obterDossieDaAnalise } from "@/lib/dados/dossies";
import { obterPropriedade, obterTalhao } from "@/lib/dados/propriedades";
import { formatarPercentual } from "@/lib/geo/analise";
import { formatarHa } from "@/lib/geo/talhao";
import { formatarDataIso, formatoDataHora } from "@/lib/formato";
import { EXPLICACAO_RISCO } from "@/lib/risco";
import { analisarTalhao, gerarDossie } from "./actions";
import { BotaoAnalisar } from "./botao-analisar";

export const metadata: Metadata = { title: "Análise do talhão" };

export default async function PaginaAnalise({ params }: PageProps<"/propriedades/[id]/talhoes/[talhaoId]/analise">) {
  const { id, talhaoId } = await params;
  const usuario = await usuarioAtual();
  const p = await obterPropriedade(usuario.id, id);
  const t = await obterTalhao(usuario.id, p.id, talhaoId);
  const analise = await obterUltimaAnalise(usuario.id, t.id);
  const obsoleta = !analise && (await temAnaliseObsoleta(usuario.id, t.id));
  const qtdAnalises = await contarAnalises(usuario.id, t.id);
  const dossie = analise ? await obterDossieDaAnalise(usuario.id, analise.id) : null;
  const acao = analisarTalhao.bind(null, p.id, t.id);

  const talhao: FeatureCollection = {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: t.geometria }],
  };
  const camadas: CamadaMapa[] = [
    { id: "talhao", colecao: talhao, cor: "#a8a29e", opacidade: 0.2, contorno: COR_CONTORNO, larguraContorno: 2.5 },
  ];
  if (analise && analise.sobreposicao.features.length > 0) {
    camadas.push({
      id: "sobreposicao",
      colecao: analise.sobreposicao,
      cor: COR_SOBREPOSICAO,
      opacidade: 0.55,
      contorno: COR_CONTORNO_SOBREPOSICAO,
      tracejado: true,
    });
  }
  const sobreposicoes = analise?.sobreposicao.features ?? [];

  return (
    <>
      <Trilha
        itens={[
          { rotulo: "Propriedades", href: "/propriedades" },
          { rotulo: p.nome, href: `/propriedades/${p.id}` },
          { rotulo: t.nome, href: `/propriedades/${p.id}/talhoes/${t.id}` },
          { rotulo: "Análise" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <section aria-labelledby="titulo-resultado" className="space-y-4">
          <h1 id="titulo-resultado" className="text-2xl font-semibold">
            Resultado
          </h1>

          {analise ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <SeloRisco risco={analise.risco} tamanho="grande" />
              <p className="text-sm text-stone-700">{EXPLICACAO_RISCO[analise.risco]}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-stone-600">Área sobreposta</dt>
                <dd className="font-medium" data-testid="area-sobreposta">
                  {formatarHa(analise.areaSobrepostaHa)} ({formatarPercentual(analise.percentual)})
                </dd>
                <dt className="text-stone-600">Alertas após 31/12/2020</dt>
                <dd className="font-medium">{sobreposicoes.length}</dd>
                <dt className="text-stone-600">Área do talhão</dt>
                <dd className="font-medium">{formatarHa(t.areaHa)}</dd>
                <dt className="text-stone-600">Base</dt>
                <dd className="font-medium">
                  {analise.base.fonte} {analise.base.versao}
                </dd>
                <dt className="text-stone-600">Analisado em</dt>
                <dd className="font-medium">{formatoDataHora.format(analise.criadaEm)}</dd>
              </dl>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-700">
              {obsoleta
                ? "O polígono do talhão mudou depois da última análise. Analise de novo para atualizar o risco."
                : "Este talhão ainda não foi analisado. A análise cruza o polígono com os alertas de desmatamento detectados após 31/12/2020."}
            </p>
          )}

          {dossie ? (
            <div className="space-y-3 rounded-lg border border-green-200 bg-green-50/60 p-4" data-testid="dossie">
              <div>
                <p className="text-sm text-stone-600">Dossiê emitido em {formatoDataHora.format(dossie.emitidoEm)}</p>
                <p className="font-mono text-lg font-semibold text-green-900">{dossie.codigo}</p>
              </div>
              <blockquote className="border-l-2 border-green-700 pl-3 text-sm text-stone-800">
                {dossie.resumo}
                <footer className="mt-1 text-xs text-stone-600">
                  {dossie.resumoPorIA ? "Resumo redigido por IA (Gemini)" : "Resumo padrão (IA indisponível)"}
                </footer>
              </blockquote>
              <a href={`/dossies/${dossie.codigo}/pdf`} className={`${classeBotao.primario} w-full`}>
                Baixar dossiê PDF
              </a>
              <a
                href={`/verificar/${dossie.codigo}`}
                target="_blank"
                rel="noopener"
                className="block text-center text-sm font-medium text-green-800 hover:underline"
              >
                Abrir página de verificação
              </a>
            </div>
          ) : analise ? (
            <BotaoAnalisar
              acao={gerarDossie.bind(null, p.id, t.id)}
              rotulo="Gerar dossiê PDF"
              rotuloPendente="Gerando dossiê…"
            />
          ) : null}
          <BotaoAnalisar
            acao={acao}
            rotulo={analise ? "Nova análise" : "Analisar talhão"}
            variante={analise ? "secundario" : "primario"}
          />
          <Link href={`/propriedades/${p.id}/talhoes/${t.id}`} className={`${classeBotao.secundario} w-full`}>
            Editar talhão
          </Link>
          {qtdAnalises > 0 ? (
            <Link
              href={`/propriedades/${p.id}/talhoes/${t.id}/analise/historico`}
              className="block text-sm font-medium text-green-800 hover:underline"
            >
              Ver histórico ({qtdAnalises})
            </Link>
          ) : null}
        </section>

        <section aria-label="Mapa da análise" className="space-y-2">
          <MapaLeitura
            camadas={camadas}
            enquadrarEm={talhao}
            className="h-[60vh] min-h-80"
            rotulo={
              sobreposicoes.length > 0
                ? `Mapa do talhão ${t.nome} com ${sobreposicoes.length} área(s) sobreposta(s) a alertas em vermelho`
                : `Mapa do talhão ${t.nome}`
            }
          />
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-3 w-4 border-2 border-green-900 bg-stone-300/50" />
              Talhão
            </span>
            {sobreposicoes.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-3 w-4 border-2 border-dashed border-red-800 bg-red-600/60" />
                Sobreposição com alertas após 31/12/2020
              </span>
            ) : null}
          </p>

          {sobreposicoes.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
              <table className="w-full text-left text-sm">
                <caption className="px-4 pt-3 text-left font-semibold">Alertas sobrepostos</caption>
                <thead className="text-stone-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Código do alerta</th>
                    <th scope="col" className="px-4 py-2 font-medium">Detectado em</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Área no talhão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sobreposicoes.map((s, i) => (
                    <tr key={`${s.properties.codigo ?? "sem-codigo"}-${i}`}>
                      <td className="px-4 py-2">{s.properties.codigo ?? "—"}</td>
                      <td className="px-4 py-2">{formatarDataIso(s.properties.dataDeteccao)}</td>
                      <td className="px-4 py-2 text-right">{formatarHa(s.properties.areaHa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
