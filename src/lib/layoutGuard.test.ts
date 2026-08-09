import { describe, expect, it } from "vitest";
import { findUnanchoredAbsolutes } from "./layoutGuard";

describe("findUnanchoredAbsolutes", () => {
  it("flags an absolute element with no horizontal anchor", () => {
    // This is the exact shape of the toggle-knob bug.
    const bad = `<span className="absolute top-0.5 h-5 w-5 translate-x-[22px]" />`;
    expect(findUnanchoredAbsolutes(bad)).toHaveLength(1);
  });

  it("accepts one anchored with left", () => {
    const good = `<span className="absolute left-0.5 top-0.5 h-5 w-5 translate-x-5" />`;
    expect(findUnanchoredAbsolutes(good)).toEqual([]);
  });

  it("accepts one anchored with right", () => {
    const good = `<span className="pointer-events-none absolute right-3 top-1/2" />`;
    expect(findUnanchoredAbsolutes(good)).toEqual([]);
  });

  it("accepts inset and logical properties", () => {
    expect(
      findUnanchoredAbsolutes(`<div className="absolute inset-0" />`),
    ).toEqual([]);
    expect(
      findUnanchoredAbsolutes(`<div className="absolute start-2" />`),
    ).toEqual([]);
    expect(
      findUnanchoredAbsolutes(`<div className="absolute end-2" />`),
    ).toEqual([]);
  });

  it("accepts a left-1/2 centring pattern", () => {
    const good = `<span className="absolute left-1/2 -translate-x-1/2 rounded-lg" />`;
    expect(findUnanchoredAbsolutes(good)).toEqual([]);
  });

  it("handles an anchor chosen inside a template literal on the same line", () => {
    const good =
      "<span className={`absolute top-1/2 ${inline ? 'left-2' : 'left-3'}`} />";
    expect(findUnanchoredAbsolutes(good)).toEqual([]);
  });

  it("accepts an anchor the formatter wrapped onto a following line", () => {
    // Exactly how prettier breaks a long template literal with a ternary.
    const good = [
      "<span",
      "  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm ${",
      "    variant === 'inline' ? 'left-2' : 'left-3'",
      "  }`}",
      "/>",
    ].join("\n");
    expect(findUnanchoredAbsolutes(good)).toEqual([]);
  });

  it("still flags one where nothing anchors it within the window", () => {
    const bad = [
      "<span",
      "  className={`absolute top-1/2 ${",
      "    big ? 'h-6' : 'h-4'",
      "  }`}",
      "/>",
    ].join("\n");
    expect(findUnanchoredAbsolutes(bad)).toHaveLength(1);
  });

  it("does not reach past the configured lookahead", () => {
    const source = [
      '<div className="absolute top-0" />',
      "filler",
      "filler",
      "filler",
      "filler",
      '<div className="left-4" />',
    ].join("\n");
    expect(findUnanchoredAbsolutes(source)).toHaveLength(1);
  });

  it("reports the line number so the offender is findable", () => {
    const source = [
      "const a = 1;",
      '<div className="absolute top-0" />',
      "const b = 2;",
    ].join("\n");
    expect(findUnanchoredAbsolutes(source)[0]?.line).toBe(2);
  });

  it("ignores the word in comments and prose", () => {
    const comments = [
      "// absolute positioning needs an anchor",
      " * absolute elements drift without one",
      "/* absolute */",
      "{/* absolute knob lives here */}",
    ].join("\n");
    expect(findUnanchoredAbsolutes(comments)).toEqual([]);
  });

  it("does not fire on unrelated identifiers containing the word", () => {
    expect(
      findUnanchoredAbsolutes("const absoluteValue = Math.abs(x);"),
    ).toEqual([]);
    expect(findUnanchoredAbsolutes("Math.absolute;")).toEqual([]);
  });

  it("finds several offenders in one file", () => {
    const gap = ["", "", "", ""];
    const source = [
      '<div className="absolute top-0" />',
      ...gap,
      '<div className="absolute left-0 top-0" />',
      ...gap,
      '<div className="absolute bottom-0" />',
    ].join("\n");
    expect(findUnanchoredAbsolutes(source)).toHaveLength(2);
  });

  it("has a known blind spot: an anchor on a neighbouring element masks an offence", () => {
    // The lookahead cannot tell "the rest of my className" from "the next
    // element", so an anchored sibling within three lines hides a real problem.
    // Documented rather than fixed: closing it properly needs a JSX parser, and
    // the check exists to catch an obvious repeated mistake, not to be airtight.
    const masked = [
      '<div className="absolute top-0" />',
      '<div className="absolute left-0 top-0" />',
    ].join("\n");
    expect(findUnanchoredAbsolutes(masked)).toHaveLength(0);

    // Narrowing the window exposes it again.
    expect(findUnanchoredAbsolutes(masked, 0)).toHaveLength(1);
  });

  it("is clean on a file with nothing absolute in it", () => {
    expect(findUnanchoredAbsolutes("const x = 1;\nexport default x;")).toEqual(
      [],
    );
  });
});
