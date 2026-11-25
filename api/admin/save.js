// POST /api/admin/save: replaces the live product list.
import { list, del } from "@vercel/blob";
import { json, checkAuth, storageError, cleanProducts, putBlob, photoPath, CATALOG_PATH } from "../_lib.js";

export async function POST(request) {
  const denied = await checkAuth(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  let products;
  try {
    products = cleanProducts(body && body.products);
  } catch (err) {
    return json({ error: err.message }, 400);
  }

  const catalog = { updatedAt: new Date().toISOString(), products };
  try {
    await putBlob(CATALOG_PATH, JSON.stringify(catalog), {
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
  } catch (err) {
    return storageError(err);
  }

  // Tidy up: delete uploaded photos no product uses any more (older than 1 hour, so
  // photos uploaded but not yet saved are never removed).
  try {
    const used = new Set(products.map((p) => photoPath(p.image)).filter(Boolean));
    const { blobs } = await list({ prefix: "photos/", limit: 1000 });
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const unused = blobs
      .filter((b) => !used.has(b.pathname) && new Date(b.uploadedAt).getTime() < hourAgo)
      .map((b) => b.url);
    if (unused.length) await del(unused);
  } catch {
    /* clean-up is best effort */
  }

  return json({ ok: true, updatedAt: catalog.updatedAt });
}
