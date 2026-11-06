// PDF do dossiê (US10, RF14, RF15). Gerado no servidor a partir do conteúdo congelado na emissão.
// Fonte Helvetica embutida no PDF (WinAnsi): o texto evita símbolos fora dela (✓, ≥, emojis).
import "server-only";
import { Document, Font, Line, Page, Path, Polygon, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ConteudoDossie } from "./conteudo";
import { formatarCoordenada } from "./conteudo";
import { barraDeEscala, caminhoGeometria, caminhoQRCode, enquadrar } from "./desenho";
import { formatarPercentual } from "@/lib/geo/analise";
import { formatarHa } from "@/lib/geo/talhao";
import { formatarDataIso, formatoData, formatoDataHora } from "@/lib/formato";
import { EXPLICACAO_RISCO, ROTULO_RISCO, type Risco } from "@/lib/risco";

export const AVISO_LEGAL =
  "Este dossiê é um relatório técnico gerado automaticamente a partir de bases públicas de " +
  "desmatamento e do polígono informado pelo produtor. Ele não substitui a declaração de diligência " +
  "devida exigida pelo Regulamento (UE) 2023/1115 (EUDR), não é uma certificação e não avalia " +
  "outros requisitos do regulamento, como a legalidade da produção.";

const MAX_LINHAS_ALERTAS = 8;

// Sem hifenização automática: nomes de município e códigos não podem ser quebrados com hífen.
Font.registerHyphenationCallback((palavra) => [palavra]);

const COR = {
  texto: "#1c1917",
  suave: "#57534e",
  borda: "#d6d3d1",
  verde: "#14532d",
  talhao: "#e7e5e4",
  sobreposicao: "#dc2626",
  contornoSobreposicao: "#991b1b",
};
const COR_RISCO: Record<Risco, { borda: string; fundo: string; texto: string }> = {
  BAIXO: { borda: "#15803d", fundo: "#f0fdf4", texto: "#14532d" },
  ATENCAO: { borda: "#d97706", fundo: "#fffbeb", texto: "#78350f" },
  ALTO: { borda: "#b91c1c", fundo: "#fef2f2", texto: "#7f1d1d" },
};

const s = StyleSheet.create({
  pagina: { padding: 34, paddingBottom: 46, fontFamily: "Helvetica", fontSize: 9, color: COR.texto, lineHeight: 1.35 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  marca: { fontFamily: "Helvetica-Bold", fontSize: 15, color: COR.verde },
  titulo: { fontSize: 11, color: COR.suave, marginTop: 2 },
  codigo: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "right" },
  pequeno: { fontSize: 8, color: COR.suave },
  secao: { marginBottom: 9 },
  tituloSecao: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: COR.verde, marginBottom: 5, borderBottomWidth: 0.75, borderBottomColor: COR.borda, paddingBottom: 2 },
  linha: { flexDirection: "row", marginBottom: 1.5 },
  rotulo: { width: 100, color: COR.suave },
  valor: { flex: 1, fontFamily: "Helvetica-Bold" },
  colunas: { flexDirection: "row", gap: 14 },
  risco: { borderWidth: 1.5, borderRadius: 4, padding: 7, marginBottom: 10 },
  riscoTitulo: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 2 },
  tabela: { borderWidth: 0.75, borderColor: COR.borda, borderRadius: 3 },
  celulaCab: { fontFamily: "Helvetica-Bold", color: COR.suave, paddingVertical: 2, paddingHorizontal: 4 },
  celula: { paddingVertical: 1.5, paddingHorizontal: 4 },
  aviso: { borderWidth: 0.75, borderColor: COR.borda, borderRadius: 3, padding: 7, fontSize: 8, color: COR.suave },
  rodape: { position: "absolute", bottom: 20, left: 34, right: 34, fontSize: 7.5, color: COR.suave },
});

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={s.linha}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <Text style={s.valor}>{valor}</Text>
    </View>
  );
}

const LARGURA_MAPA = 250;
const ALTURA_MAPA = 190;

/** Mapa vetorial: talhão, sobreposições em vermelho, norte e barra de escala. */
function MapaTalhao({ c }: { c: ConteudoDossie }) {
  const e = enquadrar([c.talhao.geometria], LARGURA_MAPA, ALTURA_MAPA, 18);
  const barra = barraDeEscala(e);
  return (
    <View>
      <Svg width={LARGURA_MAPA} height={ALTURA_MAPA} viewBox={`0 0 ${LARGURA_MAPA} ${ALTURA_MAPA}`}>
        <Path d={`M0 0H${LARGURA_MAPA}V${ALTURA_MAPA}H0Z`} fill="#fafaf9" stroke={COR.borda} strokeWidth={0.75} />
        <Path d={caminhoGeometria(c.talhao.geometria, e)} fill={COR.talhao} fillRule="evenodd" stroke={COR.verde} strokeWidth={1.5} />
        {c.analise.sobreposicao.features.map((f, i) => (
          <Path
            key={i}
            d={caminhoGeometria(f.geometry, e)}
            fill={COR.sobreposicao}
            fillOpacity={0.6}
            fillRule="evenodd"
            stroke={COR.contornoSobreposicao}
            strokeWidth={0.75}
            strokeDasharray="2 1.5"
          />
        ))}
        {/* Norte */}
        <Polygon points={`${LARGURA_MAPA - 16},8 ${LARGURA_MAPA - 21},22 ${LARGURA_MAPA - 11},22`} fill={COR.texto} />
        {/* Escala */}
        <Line x1={10} y1={ALTURA_MAPA - 10} x2={10 + barra.comprimento} y2={ALTURA_MAPA - 10} stroke={COR.texto} strokeWidth={2} />
      </Svg>
      <Text style={[s.pequeno, { width: LARGURA_MAPA, marginTop: 2 }]}>
        Barra de escala: {barra.rotulo}. Norte para cima. Cinza: talhão; vermelho: sobreposição com alertas após
        31/12/2020.
      </Text>
    </View>
  );
}

function QRCodeVerificacao({ url }: { url: string }) {
  const { d, lado } = caminhoQRCode(url);
  return (
    <Svg width={84} height={84} viewBox={`0 0 ${lado} ${lado}`}>
      <Path d={`M0 0H${lado}V${lado}H0Z`} fill="#ffffff" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}

export function DocumentoDossie({ c }: { c: ConteudoDossie }) {
  const cor = COR_RISCO[c.analise.risco];
  const alertas = c.analise.alertas;
  const emitidoEm = new Date(c.emitidoEm);
  return (
    <Document
      title={`Dossiê ${c.codigo}`}
      author="RastroVerde"
      subject="Dossiê de conformidade EUDR"
      creator="RastroVerde"
      producer="RastroVerde"
      language="pt-BR"
      creationDate={emitidoEm}
      modificationDate={emitidoEm}
    >
      <Page size="A4" style={s.pagina}>
        <View style={s.topo}>
          <View>
            <Text style={s.marca}>RastroVerde</Text>
            <Text style={s.titulo}>Dossiê de conformidade socioambiental (EUDR)</Text>
          </View>
          <View>
            <Text style={s.codigo}>{c.codigo}</Text>
            <Text style={[s.pequeno, { textAlign: "right" }]}>Emitido em {formatoDataHora.format(emitidoEm)}</Text>
          </View>
        </View>

        <View style={[s.risco, { borderColor: cor.borda, backgroundColor: cor.fundo }]}>
          <Text style={[s.riscoTitulo, { color: cor.texto }]}>Risco {ROTULO_RISCO[c.analise.risco].toLowerCase()}</Text>
          <Text>{EXPLICACAO_RISCO[c.analise.risco]}</Text>
        </View>

        <View style={[s.colunas, s.secao]}>
          <View style={{ flex: 1 }}>
            <Text style={s.tituloSecao}>Propriedade e talhão</Text>
            <Linha rotulo="Propriedade" valor={c.propriedade.nome} />
            <Linha rotulo="Município/UF" valor={`${c.propriedade.municipio}/${c.propriedade.uf}`} />
            <Linha rotulo="Cultura" valor={c.propriedade.cultura} />
            <Linha rotulo="CAR" valor={c.propriedade.car ?? "não informado"} />
            <Linha rotulo="Talhão" valor={c.talhao.nome} />
            <Linha rotulo="Área do talhão" valor={formatarHa(c.talhao.areaHa)} />
            <Linha rotulo="Centroide (WGS 84)" valor={formatarCoordenada(c.talhao.centroide)} />

            <Text style={[s.tituloSecao, { marginTop: 10 }]}>Resultado da análise</Text>
            <Linha rotulo="Área sobreposta" valor={`${formatarHa(c.analise.areaSobrepostaHa)} (${formatarPercentual(c.analise.percentual)})`} />
            <Linha rotulo="Alertas após 31/12/2020" valor={String(alertas.length)} />
            <Linha rotulo="Analisado em" valor={formatoDataHora.format(new Date(c.analise.criadaEm))} />
            <Linha rotulo="Base de alertas" valor={`${c.base.fonte}, versão ${c.base.versao}`} />
            <Linha rotulo="Data de corte" valor="31/12/2020" />
          </View>
          <MapaTalhao c={c} />
        </View>

        {alertas.length > 0 ? (
          <View style={s.secao} wrap={false}>
            <Text style={s.tituloSecao}>Alertas de desmatamento dentro do talhão</Text>
            <View style={s.tabela}>
              <View style={{ flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: COR.borda }}>
                <Text style={[s.celulaCab, { flex: 3 }]}>Código do alerta</Text>
                <Text style={[s.celulaCab, { flex: 1 }]}>Detectado em</Text>
                <Text style={[s.celulaCab, { flex: 1, textAlign: "right" }]}>Área no talhão</Text>
              </View>
              {alertas.slice(0, MAX_LINHAS_ALERTAS).map((a, i) => (
                <View key={i} style={{ flexDirection: "row" }}>
                  <Text style={[s.celula, { flex: 3 }]}>{a.codigo ?? "sem código"}</Text>
                  <Text style={[s.celula, { flex: 1 }]}>{formatarDataIso(a.dataDeteccao)}</Text>
                  <Text style={[s.celula, { flex: 1, textAlign: "right" }]}>{formatarHa(a.areaHa)}</Text>
                </View>
              ))}
            </View>
            {alertas.length > MAX_LINHAS_ALERTAS ? (
              <Text style={[s.pequeno, { marginTop: 2 }]}>
                E mais {alertas.length - MAX_LINHAS_ALERTAS} alerta(s) menores, incluídos na área sobreposta.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={s.secao} wrap={false}>
          <Text style={s.tituloSecao}>Resumo em linguagem simples</Text>
          <Text>{c.resumo.texto}</Text>
          <Text style={[s.pequeno, { marginTop: 2 }]}>
            {c.resumo.porIA
              ? "Texto redigido por inteligência artificial (Google Gemini) a partir dos números acima."
              : "Texto padrão gerado a partir dos números acima."}
          </Text>
        </View>

        <View style={[s.colunas, s.secao]} wrap={false}>
          <QRCodeVerificacao url={c.urlVerificacao} />
          <View style={{ flex: 1 }}>
            <Text style={s.tituloSecao}>Verificação de autenticidade</Text>
            <Text>
              Leia o QR code ou acesse o endereço abaixo para conferir este dossiê. A página mostra a data, o
              risco e o hash SHA-256 deste arquivo, sem dados pessoais do produtor.
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 4 }}>{c.urlVerificacao}</Text>
            <Text style={[s.pequeno, { marginTop: 4 }]}>
              Critério de risco: baixo = sem sobreposição; atenção = menos de 1% da área e menos de 0,5 ha;
              alto = demais casos. Sobreposições menores que 1 m² são desconsideradas.
            </Text>
          </View>
        </View>

        <View style={s.aviso} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Aviso legal</Text>
          <Text>{AVISO_LEGAL}</Text>
        </View>

        <Text style={s.rodape} fixed>
          Dossiê {c.codigo} · emitido em {formatoData.format(emitidoEm)} · não substitui a declaração oficial EUDR
        </Text>
      </Page>
    </Document>
  );
}

/** Gera os bytes do PDF. */
export async function gerarPdf(c: ConteudoDossie): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<DocumentoDossie c={c} />));
}
