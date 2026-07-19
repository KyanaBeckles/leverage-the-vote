import { describe, expect, it, vi } from "vitest";

// voterSearch.js imports "@/api/base44Client" at module top, which
// constructs a real base44 client as an import-time side effect. That chain
// (base44Client -> src/lib/app-params.js) has a genuine bug: `getAppParams`
// passes `window.location.href` as an eagerly-evaluated default-parameter
// expression, so it dereferences `window` unconditionally — outside the
// file's own `isNode` guard — and throws `ReferenceError: window is not
// defined` under plain Node/vitest (no jsdom). That's a pre-existing bug in
// app-params.js, not in the two files under test, so it isn't fixed here.
// We mock the base44Client module (already out of scope per the task — only
// extractLastName/lastNameQueryVariants/parseCityGuess are pure and tested)
// so the import chain never runs, and stay on the plain "node" environment
// with no jsdom.
vi.mock("@/api/base44Client", () => ({ base44: {} }));

// fetchCandidateVoters itself is intentionally NOT imported/tested: it hits
// the network (Supabase + base44) and isn't a pure function.
import { extractLastName, lastNameQueryVariants, parseCityGuess } from "../voterSearch.js";

describe("extractLastName", () => {
  it("extracts the last name from a basic first+last name", () => {
    expect(extractLastName("Richard Bellavance")).toBe("BELLAVANCE");
  });

  it("strips a generational suffix before extracting the last name", () => {
    expect(extractLastName("John Smith Jr")).toBe("SMITH");
  });

  it("returns null for a single-word name", () => {
    expect(extractLastName("Cher")).toBeNull();
  });
});

describe("lastNameQueryVariants", () => {
  it("orders a spaced multi-word surname most-specific first: 'Agnes La Voix'", () => {
    expect(lastNameQueryVariants("Agnes La Voix")).toEqual(["LA VOIX", "VOIX"]);
  });

  it("includes the prefix-split form for a run-together multi-word surname: 'Agnes LaVoix'", () => {
    const variants = lastNameQueryVariants("Agnes LaVoix");
    expect(variants).toContain("LA VOIX");
  });

  it("returns an empty array for a single-word name", () => {
    expect(lastNameQueryVariants("Cher")).toEqual([]);
  });

  it("strips a generational suffix: 'John Smith Jr' -> ['SMITH']", () => {
    expect(lastNameQueryVariants("John Smith Jr")).toEqual(["SMITH"]);
  });
});

describe("parseCityGuess", () => {
  it("extracts a ZIP with no city from ZIP-only input", () => {
    expect(parseCityGuess("02130")).toEqual({ cities: [], zip: "02130" });
  });

  it("extracts both city and zip from 'Dorchester MA 02124'", () => {
    const result = parseCityGuess("Dorchester MA 02124");
    expect(result.zip).toBe("02124");
    expect(result.cities[0]).toBe("DORCHESTER");
  });

  it("expands a Boston neighborhood to include BOSTON itself", () => {
    const result = parseCityGuess("ROXBURY");
    expect(result.cities).toContain("ROXBURY");
    expect(result.cities).toContain("BOSTON");
  });

  it("expands 'Boston' to include its neighborhoods", () => {
    const result = parseCityGuess("Boston");
    expect(result.cities).toContain("BOSTON");
    expect(result.cities).toContain("DORCHESTER");
    expect(result.cities).toContain("ROXBURY");
  });

  it("returns an empty result for empty input", () => {
    expect(parseCityGuess("")).toEqual({ cities: [], zip: null });
  });

  it("returns an empty result for null input", () => {
    expect(parseCityGuess(null)).toEqual({ cities: [], zip: null });
  });
});
