/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { findUnanchoredAbsolutes } from "../lib/layoutGuard";

/**
 * Feeds every component's real source through the layout guard.
 *
 * Sources are pulled in by Vite rather than the filesystem, so this needs no
 * node types and runs in the same environment as everything else.
 * See `layoutGuard.ts` for why this check exists at all.
 */
const sources = import.meta.glob("./*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("every absolutely positioned element is anchored horizontally", () => {
  it("actually loaded the component sources", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  for (const [path, source] of Object.entries(sources)) {
    it(`${path.replace("./", "")} pins every absolute element`, () => {
      const offenders = findUnanchoredAbsolutes(source).map(
        (o) => `line ${o.line}: ${o.text.trim().slice(0, 90)}`,
      );
      expect(
        offenders,
        "absolute without left/right inherits text-align and drifts",
      ).toEqual([]);
    });
  }
});

describe("the toggle knob stays inside its track", () => {
  const ui = sources["./ui.tsx"] ?? "";

  it("anchors the knob to the left edge rather than the static position", () => {
    expect(ui).toContain("absolute left-0.5 top-0.5");
  });

  it("travels the track width less the knob and its insets", () => {
    // Track w-11 = 44px, knob w-5 = 20px, 2px inset each side -> 20px of travel.
    expect(ui).toContain('checked ? "translate-x-5" : "translate-x-0"');
  });

  it("clips the knob to the track as a second line of defence", () => {
    expect(ui).toMatch(
      /relative h-6 w-11 shrink-0 overflow-hidden rounded-full/,
    );
  });
});
