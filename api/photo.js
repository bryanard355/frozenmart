// GET /api/photo?p=photos/<file>: serves product photos from a private Blob store.
// Each upload has a unique name, so responses can be cached by the CDN for a long time.
import { readBlob } from "./_lib.js";

export async function GET(request) {
  const p = new URL(request.url).searchParams.get("p") || "";
  if (!/^photos\/[\w.-]+$/.test(p)) return new Response("Not found", { status: 404 });
  try {
    const res = await readBlob(p, false);
    if (!res) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    return new Response(res.stream, {
      headers: {
        "content-type": (res.blob && res.blob.contentType) || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
