import { describe, expect, it } from "vitest";
import { riscoMaisGrave } from "./risco";

describe("riscoMaisGrave", () => {
  it("devolve o pior risco", () => {
    expect(riscoMaisGrave(["BAIXO", "ALTO", "ATENCAO"])).toBe("ALTO");
    expect(riscoMaisGrave(["BAIXO", "ATENCAO", "BAIXO"])).toBe("ATENCAO");
    expect(riscoMaisGrave(["BAIXO"])).toBe("BAIXO");
  });

  it("lista vazia → null", () => {
    expect(riscoMaisGrave([])).toBeNull();
  });
});
