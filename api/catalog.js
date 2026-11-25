// GET /api/catalog: the live product list for the shop (public).
import { get, head } from "@vercel/blob";
import { json, CATALOG_PATH } from "./_lib.js";

export async function GET(request) {
  // Diagnostic: /api/catalog?check=1 asks storage directly (bypassing caches) whether a save exists.
  if (new URL(request.url).searchParams.get("check") === "1") {
    try {
      const h = await head(CATALOG_PATH);
      return json({ exists: true, uploadedAt: h.uploadedAt, size: h.size, cacheControl: h.cacheControl });
    } catch (err) {
      return json({ exists: false, reason: String((err && err.name) || "") + ": " + String((err && err.message) || err).slice(0, 160) });
    }
  }
  try {
    const res = await get(CATALOG_PATH, { access: "public", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) {
      return json({ products: null }, 200, { "cache-control": "public, max-age=0, s-maxage=5" });
    }
    const data = JSON.parse(await new Response(res.stream).text());
    // Short CDN cache keeps it fast while stock changes still show within seconds.
    return json(data, 200, { "cache-control": "public, max-age=0, s-maxage=5" });
  } catch (err) {
    // Storage not set up yet, or temporarily unavailable: the shop falls back to products.js.
    return json({ products: null, error: "unavailable" }, 200);
  }
}
