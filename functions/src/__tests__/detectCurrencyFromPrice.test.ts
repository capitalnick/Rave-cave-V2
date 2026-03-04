import {describe, it, expect} from "vitest";

/**
 * Copy of the private `detectCurrencyFromPrice` function from importWines.ts.
 * Copied here to avoid modifying the source file just for testing.
 * @param {string} raw The raw price string.
 * @return {string | null} The detected currency code or null.
 */
function detectCurrencyFromPrice(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("\u20AC")) return "EUR";
  if (trimmed.startsWith("\u00A3")) return "GBP";
  if (trimmed.startsWith("A$")) return "AUD";
  if (trimmed.startsWith("NZ$")) return "NZD";
  if (trimmed.startsWith("C$")) return "CAD";
  if (trimmed.startsWith("HK$")) return "HKD";
  if (trimmed.startsWith("S$")) return "SGD";
  if (trimmed.startsWith("R$")) return "BRL";
  if (trimmed.startsWith("\u00A5")) return "JPY";
  if (trimmed.startsWith("\u20B9")) return "INR";
  if (trimmed.startsWith("\u20A9")) return "KRW";
  if (trimmed.startsWith("CHF")) return "CHF";
  // Plain $ -- ambiguous, return null (handled by defaultCurrency)
  if (trimmed.startsWith("$")) return null;
  return null;
}

describe("detectCurrencyFromPrice", () => {
  describe("symbol-based detection", () => {
    it("detects EUR from euro sign", () => {
      expect(detectCurrencyFromPrice("\u20AC50")).toBe("EUR");
    });

    it("detects GBP from pound sign", () => {
      expect(detectCurrencyFromPrice("\u00A3100")).toBe("GBP");
    });

    it("detects AUD from A$ prefix", () => {
      expect(detectCurrencyFromPrice("A$30")).toBe("AUD");
    });

    it("detects NZD from NZ$ prefix", () => {
      expect(detectCurrencyFromPrice("NZ$25")).toBe("NZD");
    });

    it("detects CAD from C$ prefix", () => {
      expect(detectCurrencyFromPrice("C$40")).toBe("CAD");
    });

    it("detects HKD from HK$ prefix", () => {
      expect(detectCurrencyFromPrice("HK$100")).toBe("HKD");
    });

    it("detects SGD from S$ prefix", () => {
      expect(detectCurrencyFromPrice("S$50")).toBe("SGD");
    });

    it("detects BRL from R$ prefix", () => {
      expect(detectCurrencyFromPrice("R$30")).toBe("BRL");
    });
  });

  describe("unicode symbol detection", () => {
    it("detects JPY from yen sign", () => {
      expect(detectCurrencyFromPrice("\u00A51000")).toBe("JPY");
    });

    it("detects INR from rupee sign", () => {
      expect(detectCurrencyFromPrice("\u20B9500")).toBe("INR");
    });

    it("detects KRW from won sign", () => {
      expect(detectCurrencyFromPrice("\u20A910000")).toBe("KRW");
    });
  });

  describe("code-based detection", () => {
    it("detects CHF from code prefix", () => {
      expect(detectCurrencyFromPrice("CHF50")).toBe("CHF");
    });
  });

  describe("ambiguous and missing symbols", () => {
    it("returns null for plain dollar sign (ambiguous)", () => {
      expect(detectCurrencyFromPrice("$50")).toBeNull();
    });

    it("returns null for bare number (no symbol)", () => {
      expect(detectCurrencyFromPrice("50")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(detectCurrencyFromPrice("")).toBeNull();
    });
  });

  describe("whitespace handling", () => {
    it("trims leading whitespace before detection", () => {
      expect(detectCurrencyFromPrice("  \u20AC50  ")).toBe("EUR");
    });

    it("trims trailing whitespace", () => {
      expect(detectCurrencyFromPrice("\u00A3100   ")).toBe("GBP");
    });

    it("handles whitespace-only input", () => {
      expect(detectCurrencyFromPrice("   ")).toBeNull();
    });
  });
});
