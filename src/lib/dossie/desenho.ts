// Desenho vetorial do dossiê: mapa do talhão (RF15) e QR code (US12), como caminhos SVG.
// O mapa é desenhado no servidor sem imagem de fundo: talhão, sobreposições, norte e escala.
import QRCode from "qrcode";
import type { Position } from "geojson";
import type { GeometriaTalhao } from "@/lib/geo/talhao";

const METROS_POR_GRAU = 111_320;

export type Enquadramento = {
  largura: number;
  altura: number;
  /** Converte [lng, lat] em [x, y] na área de desenho. */
  projetar: (p: Position) => [number, number];
  /** Unidades de desenho por metro no terreno. */
  escala: number;
};

function poligonosDe(g: GeometriaTalhao): Position[][][] {
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}

/**
 * Enquadra as geometrias numa área de largura × altura com margem, mantendo a proporção.
 * Projeção equiretangular local (cos da latitude central), suficiente para um talhão.
 */
export function enquadrar(geometrias: GeometriaTalhao[], largura: number, altura: number, margem = 12): Enquadramento {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const g of geometrias)
    for (const p of poligonosDe(g))
      for (const anel of p)
        for (const [lng, lat] of anel) {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const larguraM = Math.max((maxLng - minLng) * k * METROS_POR_GRAU, 1);
  const alturaM = Math.max((maxLat - minLat) * METROS_POR_GRAU, 1);
  const escala = Math.min((largura - 2 * margem) / larguraM, (altura - 2 * margem) / alturaM);
  const dx = (largura - larguraM * escala) / 2;
  const dy = (altura - alturaM * escala) / 2;
  return {
    largura,
    altura,
    escala,
    projetar: ([lng, lat]) => [
      +(dx + (lng - minLng) * k * METROS_POR_GRAU * escala).toFixed(2),
      +(dy + (maxLat - lat) * METROS_POR_GRAU * escala).toFixed(2),
    ],
  };
}

/** Caminho SVG (todos os anéis; use fill-rule evenodd para os buracos). */
export function caminhoGeometria(g: GeometriaTalhao, e: Enquadramento): string {
  return poligonosDe(g)
    .flatMap((p) =>
      p.map((anel) => anel.map((pos, i) => `${i === 0 ? "M" : "L"}${e.projetar(pos).join(" ")}`).join(" ") + " Z"),
    )
    .join(" ");
}

/** Barra de escala com comprimento "redondo" (1, 2 ou 5 × 10ⁿ m) de até ~1/4 da largura. */
export function barraDeEscala(e: Enquadramento): { metros: number; comprimento: number; rotulo: string } {
  const alvo = e.largura / 4 / e.escala;
  const potencia = 10 ** Math.floor(Math.log10(alvo));
  const metros = [5, 2, 1].map((m) => m * potencia).find((m) => m <= alvo) ?? potencia;
  return {
    metros,
    comprimento: metros * e.escala,
    rotulo: metros >= 1000 ? `${metros / 1000} km` : `${metros} m`,
  };
}

/** QR code como um caminho SVG de quadrados, num quadro de (tamanho + 2 × borda) módulos. */
export function caminhoQRCode(texto: string, borda = 2): { d: string; lado: number } {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const partes: string[] = [];
  for (let linha = 0; linha < modules.size; linha++)
    for (let coluna = 0; coluna < modules.size; coluna++)
      if (modules.data[linha * modules.size + coluna]) partes.push(`M${coluna + borda} ${linha + borda}h1v1h-1z`);
  return { d: partes.join(""), lado: modules.size + 2 * borda };
}
