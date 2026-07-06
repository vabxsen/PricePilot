import { describe, expect, it } from "vitest";
import { extractPriceFromHtml, extractProductSnapshot } from "./extract.js";

function jsonLdHtml(json: unknown): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head><body></body></html>`;
}

describe("extractPriceFromHtml", () => {
  it("parses a schema.org Product/Offer block", () => {
    const html = jsonLdHtml({
      "@context": "https://schema.org/",
      "@type": "Product",
      name: "Wireless Headphones",
      brand: { name: "Acme" },
      image: ["https://example.com/img.jpg"],
      offers: {
        "@type": "Offer",
        price: "199.99",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    });

    const snap = extractPriceFromHtml(html);
    expect(snap.title).toBe("Wireless Headphones");
    expect(snap.brand).toBe("Acme");
    expect(snap.imageUrl).toBe("https://example.com/img.jpg");
    expect(snap.price).toBe(199.99);
    expect(snap.currency).toBe("USD");
    expect(snap.inStock).toBe(true);
    expect(snap.source).toBe("jsonld");
  });

  it("falls back to OpenGraph product meta tags", () => {
    const html = `<html><head>
      <meta property="og:title" content="Test Widget" />
      <meta property="product:price:amount" content="49.5" />
      <meta property="product:price:currency" content="USD" />
    </head></html>`;
    const snap = extractPriceFromHtml(html);
    expect(snap.title).toBe("Test Widget");
    expect(snap.price).toBe(49.5);
    expect(snap.source).toBe("opengraph");
  });

  it("returns a null price when nothing is found", () => {
    const snap = extractPriceFromHtml("<html><body>no data here</body></html>");
    expect(snap.price).toBeNull();
    expect(snap.inStock).toBe(false);
  });

  it("detects out-of-stock offers", () => {
    const html = jsonLdHtml({
      "@type": "Product",
      name: "Sold Out Thing",
      offers: {
        "@type": "Offer",
        price: 10,
        priceCurrency: "USD",
        availability: "https://schema.org/OutOfStock",
      },
    });
    const snap = extractPriceFromHtml(html);
    expect(snap.inStock).toBe(false);
  });

  it("decodes HTML entities some retailers wrongly embed in JSON-LD text", () => {
    const html = jsonLdHtml({
      "@type": "Product",
      name: "ASUS TUF Gaming Laptop, 16&quot;(40 cm), &amp; Windows 11",
      brand: { name: "ASUS &amp; Co" },
      offers: { "@type": "Offer", price: 99990, priceCurrency: "INR", availability: "https://schema.org/InStock" },
    });
    const snap = extractPriceFromHtml(html);
    expect(snap.title).toBe('ASUS TUF Gaming Laptop, 16"(40 cm), & Windows 11');
    expect(snap.brand).toBe("ASUS & Co");
  });

  it("ignores malformed JSON-LD blocks instead of throwing", () => {
    const html = `<html><head><script type="application/ld+json">{not valid json</script></head></html>`;
    expect(() => extractPriceFromHtml(html)).not.toThrow();
  });
});

describe("extractProductSnapshot", () => {
  it("does not fall back to generic JSON-LD for a rejected Amazon page, even if it embeds another product's structured data", () => {
    // A real amazon.in search page has no #productTitle (not a single-product
    // page) but DOES embed JSON-LD Product markup for the listed items (for
    // Google rich snippets). Falling back to the generic tier here would
    // silently attribute a real but unrelated product's price to this URL.
    const html = jsonLdHtml({
      "@type": "Product",
      name: "Some Other Listed Item",
      offers: { "@type": "Offer", price: 599, priceCurrency: "INR", availability: "https://schema.org/InStock" },
    });
    const { snapshot, reason } = extractProductSnapshot(html, "https://www.amazon.in/s?k=test");
    expect(snapshot.title).toBeUndefined();
    expect(snapshot.price).toBeNull();
    expect(reason).toMatch(/no #producttitle/i);
  });

  it("still uses the generic tiers for non-Amazon retailers", () => {
    const html = jsonLdHtml({
      "@type": "Product",
      name: "Wireless Headphones",
      offers: { "@type": "Offer", price: 49.99, priceCurrency: "USD", availability: "https://schema.org/InStock" },
    });
    const { snapshot, reason } = extractProductSnapshot(html, "https://example-shop.com/p/1");
    expect(reason).toBeNull();
    expect(snapshot.title).toBe("Wireless Headphones");
    expect(snapshot.price).toBe(49.99);
  });
});
