import { beforeEach, describe, expect, it, vi } from "vitest";

// The test environment is plain Node, not jsdom, and useStore's persist
// middleware talks to localStorage synchronously as soon as the store is
// created -- so this stub has to exist before useStore is imported.
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key),
  clear: () => void memory.clear(),
});

const { useStore } = await import("./useStore");
const { decodeShareHash, encodeShareHash } = await import("../lib/share");

describe("exportData / importData round trip", () => {
  beforeEach(() => {
    memory.clear();
    useStore.persist.clearStorage();
  });

  it("survives a round trip instead of silently resetting to base data", () => {
    // Regression test: exportData() used to omit seedVersion, so importing
    // its own output always looked like a pre-versioning save to
    // migrateSaved() and got discarded in favor of baseData().
    useStore.getState().setSettings({ horizonMonths: 42 });

    const exported = useStore.getState().exportData();
    const parsed = JSON.parse(exported);
    expect(parsed.seedVersion).toBe(useStore.getState().seedVersion);

    useStore.getState().setSettings({ horizonMonths: 999 });
    const error = useStore.getState().importData(exported);

    expect(error).toBeNull();
    expect(useStore.getState().settings.horizonMonths).toBe(42);
  });

  it("rejects a payload missing assumptions or scenarios", () => {
    const error = useStore.getState().importData(JSON.stringify({}));
    expect(error).toMatch(/assumptions/);
  });

  it("survives the full share pipeline: export -> gzip+base64 hash -> decode -> import", async () => {
    useStore.getState().setSettings({ horizonMonths: 77 });
    useStore.getState().addBudgetItem({ label: "Shared line", amount: 123 });
    const budgetLength = useStore.getState().budget.length;

    const exported = useStore.getState().exportData();
    const hash = await encodeShareHash(exported);
    const decoded = await decodeShareHash(`#${hash}`);
    expect(decoded).toBe(exported);

    useStore.getState().setSettings({ horizonMonths: 1 });
    useStore.getState().importData(decoded!);

    expect(useStore.getState().settings.horizonMonths).toBe(77);
    expect(useStore.getState().budget).toHaveLength(budgetLength);
    expect(useStore.getState().budget.at(-1)?.label).toBe("Shared line");
  });

  it("returns null but discards data on a seedVersion mismatch", () => {
    const exported = JSON.parse(useStore.getState().exportData());
    const stale = JSON.stringify({
      ...exported,
      seedVersion: "some-older-build",
    });

    useStore.getState().setSettings({ horizonMonths: 55 });
    const error = useStore.getState().importData(stale);

    // No error is returned, yet the shared data was discarded -- this is
    // exactly why App.tsx's ShareImportHandler checks seedVersion itself
    // before ever calling importData, instead of trusting this return value.
    expect(error).toBeNull();
    expect(useStore.getState().settings.horizonMonths).not.toBe(55);
  });
});
