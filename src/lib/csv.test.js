import { describe, it, expect } from "vitest";
import { parseCsvLines, parseCsvHeaders } from "./csv";

describe("parseCsvLines", () => {
  it("strips a recognised header row", () => {
    const result = parseCsvLines("SKU,Name\n1,Wine", ["sku"]);
    expect(result).toEqual([["1", "Wine"]]);
  });

  it("keeps the first row when no header keyword matches", () => {
    const result = parseCsvLines("1,Wine\n2,Beer", ["sku"]);
    expect(result).toEqual([
      ["1", "Wine"],
      ["2", "Beer"],
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseCsvLines("\n\n", ["sku"])).toEqual([]);
  });
});

describe("parseCsvHeaders", () => {
  it("splits plain comma-separated headers", () => {
    expect(parseCsvHeaders("SKU,Name,Price")).toEqual(["SKU", "Name", "Price"]);
  });

  it("keeps commas inside quoted fields intact", () => {
    expect(parseCsvHeaders('"Name, Full",Price')).toEqual([
      "Name, Full",
      "Price",
    ]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    expect(parseCsvHeaders('"Wine ""Reserve""",Price')).toEqual([
      'Wine "Reserve"',
      "Price",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseCsvHeaders("")).toEqual([]);
  });
});
