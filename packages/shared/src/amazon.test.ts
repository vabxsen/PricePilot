import { describe, expect, it } from "vitest";
import { extractAmazonProduct, isAmazonHostname } from "./amazon.js";

/** Approximates the real markup structure of an Amazon product page's price/title/image blocks. */
function amazonHtml({
  title = "ASUS TUF Gaming Laptop, 16&quot;(40 cm), AMD Ryzen 7",
  currentPriceHtml = '<span class="a-price aok-align-center priceToPay" data-a-size="xl"><span class="a-offscreen">₹64,990.00</span></span>',
  originalPriceHtml = '<span class="a-price a-text-price" data-a-strikethrough="true"><span class="a-offscreen">₹99,990.00</span></span>',
  savingsHtml = '<span class="savingsPercentage">-35%</span>',
  availabilityHtml = '<div id="availability"><span class="a-size-medium a-color-success">In stock.</span></div>',
  image = '<img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/big.jpg" src="https://m.media-amazon.com/images/I/small.jpg" />',
  brand = '<a id="bylineInfo" class="a-link-normal" href="#">Visit the ASUS Store</a>',
}: Partial<{
  title: string;
  currentPriceHtml: string;
  originalPriceHtml: string;
  savingsHtml: string;
  availabilityHtml: string;
  image: string;
  brand: string;
}> = {}): string {
  return `<html><body>
    <span id="productTitle" class="a-size-large product-title-word-break">${title}</span>
    ${brand}
    ${image}
    <div id="corePriceDisplay_desktop_feature_div">
      ${currentPriceHtml}
      ${originalPriceHtml}
      ${savingsHtml}
    </div>
    ${availabilityHtml}
  </body></html>`;
}

describe("isAmazonHostname", () => {
  it("matches amazon.<any TLD> including multi-part TLDs", () => {
    expect(isAmazonHostname("amazon.com")).toBe(true);
    expect(isAmazonHostname("www.amazon.in")).toBe(true);
    expect(isAmazonHostname("amazon.co.uk")).toBe(true);
    expect(isAmazonHostname("amazon.com.au")).toBe(true);
  });

  it("matches Amazon's link shorteners", () => {
    expect(isAmazonHostname("amzn.in")).toBe(true);
    expect(isAmazonHostname("amzn.to")).toBe(true);
    expect(isAmazonHostname("a.co")).toBe(true);
  });

  it("does not match unrelated hosts", () => {
    expect(isAmazonHostname("example.com")).toBe(false);
    expect(isAmazonHostname("notamazon.com")).toBe(false);
  });
});

describe("extractAmazonProduct", () => {
  it("parses title, current price, original price, discount, image, brand, and availability", () => {
    const html = amazonHtml({});
    const { snapshot, reason } = extractAmazonProduct(html, "amazon.in");

    expect(reason).toBeNull();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.title).toBe('ASUS TUF Gaming Laptop, 16"(40 cm), AMD Ryzen 7');
    expect(snapshot!.price).toBe(64990);
    expect(snapshot!.originalPrice).toBe(99990);
    expect(snapshot!.discountPercent).toBe(35);
    expect(snapshot!.currency).toBe("INR");
    expect(snapshot!.inStock).toBe(true);
    expect(snapshot!.imageUrl).toBe("https://m.media-amazon.com/images/I/big.jpg");
    expect(snapshot!.brand).toBe("ASUS");
    expect(snapshot!.source).toBe("selector");
  });

  it("computes discountPercent from prices when no savingsPercentage span is present", () => {
    const html = amazonHtml({ savingsHtml: "" });
    const { snapshot } = extractAmazonProduct(html, "amazon.in");
    expect(snapshot!.price).toBe(64990);
    expect(snapshot!.originalPrice).toBe(99990);
    expect(snapshot!.discountPercent).toBe(35);
  });

  it("detects out-of-stock availability", () => {
    const html = amazonHtml({
      availabilityHtml: '<div id="availability"><span class="a-color-error">Currently unavailable.</span></div>',
    });
    const { snapshot } = extractAmazonProduct(html, "amazon.in");
    expect(snapshot!.inStock).toBe(false);
  });

  it("falls back to legacy #priceblock_ourprice markup", () => {
    const html = `<html><body>
      <span id="productTitle">Legacy Layout Product</span>
      <span id="priceblock_ourprice">$49.99</span>
    </body></html>`;
    const { snapshot, reason } = extractAmazonProduct(html, "amazon.com");
    expect(reason).toBeNull();
    expect(snapshot!.price).toBe(49.99);
    expect(snapshot!.currency).toBe("USD");
  });

  it("infers currency from domain even without a recognizable symbol", () => {
    const html = amazonHtml({
      currentPriceHtml: '<span class="a-price priceToPay"><span class="a-offscreen">1.234,00</span></span>',
      originalPriceHtml: "",
      savingsHtml: "",
    });
    const { snapshot } = extractAmazonProduct(html, "amazon.de");
    expect(snapshot!.currency).toBe("EUR");
  });

  it("returns a null snapshot with a reason on a CAPTCHA/bot-check page", () => {
    const html = `<html><body>
      <form action="/errors/validateCaptcha">
        <p>Type the characters you see in this image:</p>
      </form>
    </body></html>`;
    const { snapshot, reason } = extractAmazonProduct(html, "amazon.com");
    expect(snapshot).toBeNull();
    expect(reason).toMatch(/bot-check/i);
  });

  it("returns a null snapshot with a reason when markup is entirely unrecognized", () => {
    const html = "<html><body><p>This is not an Amazon product page.</p></body></html>";
    const { snapshot, reason } = extractAmazonProduct(html, "amazon.com");
    expect(snapshot).toBeNull();
    expect(reason).toMatch(/not recognized/i);
  });

  it("still returns a snapshot when title is found but price is genuinely absent", () => {
    const html = `<html><body><span id="productTitle">No Price Listed</span></body></html>`;
    const { snapshot, reason } = extractAmazonProduct(html, "amazon.com");
    expect(reason).toBeNull();
    expect(snapshot!.title).toBe("No Price Listed");
    expect(snapshot!.price).toBeNull();
  });

  it("reconstructs the price when Amazon's 'apex' layout leaves the accessible offscreen span blank (real-world markup)", () => {
    // Verified against a real, live amazon.in product page: the current-price
    // a-offscreen span is blank ("nbsp only), and the digits only exist in a
    // sibling aria-hidden span as separate symbol/whole spans. The
    // strikethrough (MRP) span behaves normally.
    const html = amazonHtml({
      currentPriceHtml:
        '<span id="apex-pricetopay-accessibility-label" class="aok-offscreen"> ₹3,999.00 with 27 percent savings </span>' +
        '<span class="a-price aok-align-center reinventPricePriceToPayMargin priceToPay apex-pricetopay-value" data-a-size="xl" data-a-color="base">' +
        '<span class="a-offscreen"> </span>' +
        '<span aria-hidden="true"><span class="a-price-symbol">₹</span><span class="a-price-whole">3,999</span></span>' +
        "</span>",
      originalPriceHtml:
        '<span class="a-price a-text-price apex-basisprice-value" data-a-strike="true">' +
        '<span class="a-offscreen">₹5,499</span><span aria-hidden="true">₹5,499</span>' +
        "</span>",
      savingsHtml: "",
    });

    const { snapshot, reason } = extractAmazonProduct(html, "amazon.in");
    expect(reason).toBeNull();
    expect(snapshot!.price).toBe(3999);
    expect(snapshot!.originalPrice).toBe(5499);
    expect(snapshot!.discountPercent).toBe(27);
    expect(snapshot!.currency).toBe("INR");
  });
});
