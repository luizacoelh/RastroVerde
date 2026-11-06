// Endereço público do app, usado no QR code do dossiê.
import "server-only";
import { headers } from "next/headers";

/** APP_URL (produção) ou o endereço da própria requisição (desenvolvimento e testes). */
export async function urlBase(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
