import { describe, expect, it } from "vitest";
import { newId } from "./ids";

const getRandomValues = <T extends Uint8Array>(array: T): T => globalThis.crypto.getRandomValues(array);

describe("newId", () => {
  it("uses crypto.randomUUID when the browser has it", () => {
    expect(newId({ randomUUID: () => "from-uuid", getRandomValues })).toBe("from-uuid");
  });

  it("still works without randomUUID (e.g. http:// on a home network)", () => {
    const a = newId({ getRandomValues });
    const b = newId({ getRandomValues });
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});
