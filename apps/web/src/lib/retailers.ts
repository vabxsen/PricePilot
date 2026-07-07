/**
 * Maps a product's store to a recognizable brand mark (color + label) for the
 * RetailerBadge. We deliberately do NOT fetch or embed real logo artwork:
 * that means external network requests (unreliable, CORS-blocked, slower) and
 * reproducing trademarked images. Instead each store gets a monogram chip in
 * its signature brand color — instantly recognizable, self-contained, and safe.
 *
 * Colors are picked to stay legible on the near-black (#020202) UI, so a few
 * inherently-dark brands (Apple, Nike, Zara, AJIO) use a lightened stand-in
 * shade rather than their true near-black brand color.
 */
export interface RetailerInfo {
  label: string;
  color: string;
}

interface RetailerDef extends RetailerInfo {
  /** Hostname fragments identifying this store (matched via `includes`). */
  hosts: string[];
}

const RETAILERS: RetailerDef[] = [
  { label: "Amazon", color: "#FF9900", hosts: ["amazon.", "amzn."] },
  { label: "Flipkart", color: "#2874F0", hosts: ["flipkart."] },
  { label: "Myntra", color: "#FF3F6C", hosts: ["myntra."] },
  { label: "AJIO", color: "#D9A441", hosts: ["ajio."] },
  { label: "Nykaa", color: "#FC2779", hosts: ["nykaa."] },
  { label: "Meesho", color: "#C24FE0", hosts: ["meesho."] },
  { label: "Snapdeal", color: "#E63C56", hosts: ["snapdeal."] },
  { label: "Croma", color: "#13B0A5", hosts: ["croma."] },
  { label: "Reliance Digital", color: "#F02B41", hosts: ["reliancedigital."] },
  { label: "Tata CLiQ", color: "#E0457B", hosts: ["tatacliq."] },
  { label: "JioMart", color: "#2A8FF7", hosts: ["jiomart."] },
  { label: "Best Buy", color: "#2E7DF6", hosts: ["bestbuy."] },
  { label: "Walmart", color: "#2A8FF7", hosts: ["walmart."] },
  { label: "Target", color: "#F0353F", hosts: ["target."] },
  { label: "eBay", color: "#4A8DF0", hosts: ["ebay."] },
  { label: "Etsy", color: "#F1641E", hosts: ["etsy."] },
  { label: "Newegg", color: "#FF8A00", hosts: ["newegg."] },
  { label: "AliExpress", color: "#FF4747", hosts: ["aliexpress."] },
  { label: "Samsung", color: "#4E7BEE", hosts: ["samsung."] },
  { label: "Apple", color: "#D1D1D6", hosts: ["apple.com"] },
  { label: "Nike", color: "#E8E8E8", hosts: ["nike."] },
  { label: "Adidas", color: "#E8E8E8", hosts: ["adidas."] },
  { label: "H&M", color: "#F0404A", hosts: ["hm.com", "www2.hm"] },
  { label: "Zara", color: "#D8D8D8", hosts: ["zara."] },
];

const NEUTRAL = "#9E9E9E";

/**
 * Resolve store branding. Prefers the URL hostname (authoritative — works even
 * for products saved before a given store was in the name map), then falls back
 * to matching the stored retailer label, then to a neutral chip with that label.
 */
export function getRetailer(retailer: string, url?: string): RetailerInfo {
  let host = "";
  if (url) {
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      host = "";
    }
  }

  if (host) {
    const byHost = RETAILERS.find((r) => r.hosts.some((h) => host.includes(h)));
    if (byHost) return { label: byHost.label, color: byHost.color };
  }

  const name = retailer.trim().toLowerCase();
  const byName = RETAILERS.find((r) => r.label.toLowerCase() === name);
  if (byName) return { label: byName.label, color: byName.color };

  return { label: retailer, color: NEUTRAL };
}

/** Black or white, whichever reads better on top of `hex`. */
export function contrastInk(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? "#020202" : "#ffffff";
}
