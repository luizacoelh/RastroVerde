import { describe, expect, it } from "vitest";
import { formatarDataIso, formatoDataHora } from "./formato";

describe("formato", () => {
  it("data ISO sem fuso", () => {
    expect(formatarDataIso("2023-05-10")).toBe("10/05/2023");
    expect(formatarDataIso("2021-01-01T00:00:00.000Z")).toBe("01/01/2021");
  });

  it("data e hora no horário de Brasília", () => {
    expect(formatoDataHora.format(new Date("2026-11-06T03:00:00Z"))).toBe("06/11/2026, 00:00");
  });
});
