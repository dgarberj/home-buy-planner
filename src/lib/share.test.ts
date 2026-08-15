import { describe, expect, it } from "vitest";
import {
  decodeShareHash,
  encodeShareHash,
  isShareHash,
  isShareSupported,
} from "./share";

describe("isShareHash", () => {
  it("recognizes a share hash", () => {
    expect(isShareHash("#share=abc123")).toBe(true);
  });

  it("does not treat a nav anchor as a share hash", () => {
    expect(isShareHash("#budget")).toBe(false);
    expect(isShareHash("")).toBe(false);
  });
});

describe("isShareSupported", () => {
  it("reports true when CompressionStream/DecompressionStream exist", () => {
    // jsdom + modern Node both expose these; this just guards against a
    // false negative in the feature-detection itself.
    expect(isShareSupported()).toBe(true);
  });
});

describe("encodeShareHash / decodeShareHash", () => {
  it("round-trips arbitrary JSON through gzip + base64url", async () => {
    const json = JSON.stringify({
      version: 1,
      seedVersion: "test-seed-v1",
      assumptions: { household: { primaryAge: 34, partnerAge: 33 } },
      budget: [{ id: "1", label: "Rent", amount: 2000 }],
      balances: [],
      scenarios: [{ id: "s1", name: "Buy now" }],
      settings: { horizonMonths: 120 },
    });

    const hash = await encodeShareHash(json);
    expect(isShareHash(`#${hash}`)).toBe(true);

    const decoded = await decodeShareHash(`#${hash}`);
    expect(decoded).toBe(json);
  });

  it("is URL-safe -- no +, /, or = characters in the encoded payload", async () => {
    const hash = await encodeShareHash(JSON.stringify({ a: "x".repeat(500) }));
    const payload = hash.replace(/^share=/, "");
    expect(payload).not.toMatch(/[+/=]/);
  });

  it("returns null for a corrupted payload", async () => {
    expect(await decodeShareHash("#share=not-valid-base64-gzip!!!")).toBeNull();
  });

  it("returns null when the hash has no share prefix", async () => {
    expect(await decodeShareHash("#budget")).toBeNull();
  });
});
