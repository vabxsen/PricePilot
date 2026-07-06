import { describe, expect, it } from "vitest";
import { normalizeProductUrl, productIdFromUrl, retailerNameFromUrl } from "./url.js";

describe("normalizeProductUrl", () => {
  it("strips tracking params, www, and trailing slashes", () => {
    const result = normalizeProductUrl(
      "https://www.Example.com/product/123/?utm_source=x&ref=abc&color=blue",
    );
    expect(result).toBe("https://example.com/product/123?color=blue");
  });
});

describe("productIdFromUrl", () => {
  it("is stable across equivalent URLs (dedupes shared listings)", async () => {
    const a = await productIdFromUrl("https://example.com/p/1?utm_source=newsletter");
    const b = await productIdFromUrl("https://www.example.com/p/1/");
    expect(a).toBe(b);
  });

  it("differs for different products", async () => {
    const a = await productIdFromUrl("https://example.com/p/1");
    const b = await productIdFromUrl("https://example.com/p/2");
    expect(a).not.toBe(b);
  });
});

describe("retailerNameFromUrl", () => {
  it("maps known retailers to friendly names", () => {
    expect(retailerNameFromUrl("https://www.amazon.com/dp/xyz")).toBe("Amazon");
  });

  it("falls back to a titlecased hostname for unknown retailers", () => {
    expect(retailerNameFromUrl("https://shop.acme-store.io/x")).toBe("Acme-store");
  });
});
