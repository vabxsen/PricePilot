import { extractPriceFromHtml, retailerNameFromUrl } from "@pricepilot/shared";

/**
 * Stateless resolver: fetches a product URL and returns a parsed price
 * snapshot. This is the ONLY server-side compute in the Spark MVP — it
 * exists purely because Firebase Spark has no compute of its own and
 * browsers can't fetch cross-origin pages (CORS). It never touches
 * Firestore; the client writes the product/tracker docs itself after
 * getting this preview. See docs/07-spark-mvp.md.
 */

export interface Env {
  ALLOWED_ORIGINS: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 PricePilotBot/0.1 (+https://github.com/vabxsen/PricePilot)";

const MAX_BODY_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 8_000;

function corsHeaders(origin: string | null, allowed: string[]): HeadersInit {
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] ?? "");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "content-type": "application/json" },
  });
}

/** Reject non-http(s) and obviously-private targets (defense in depth). */
function publiclyRoutableUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^(10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(host);
  return isPrivate ? null : url;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const headers = corsHeaders(origin, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, headers);
    }

    let body: { url?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400, headers);
    }

    const target = body.url ? publiclyRoutableUrl(body.url) : null;
    if (!target) {
      return json({ error: "url must be a public http(s) URL" }, 400, headers);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(target.toString(), {
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return json({ error: `upstream responded ${res.status}` }, 502, headers);
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return json({ error: "upstream did not return HTML" }, 415, headers);
      }

      const reader = res.body?.getReader();
      if (!reader) return json({ error: "empty upstream response" }, 502, headers);

      let received = 0;
      let html = "";
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
          await reader.cancel();
          return json({ error: "upstream response too large" }, 413, headers);
        }
        html += decoder.decode(value, { stream: true });
      }

      const snapshot = extractPriceFromHtml(html);
      return json(
        { ...snapshot, retailer: retailerNameFromUrl(target.toString()), url: target.toString() },
        200,
        headers,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "fetch failed";
      return json({ error: message }, 502, headers);
    }
  },
};
