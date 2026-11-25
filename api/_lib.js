// Shared helpers for the API functions. Files starting with "_" are not exposed as endpoints.
import { createHash, timingSafeEqual } from "node:crypto";

export const CATALOG_PATH = "catalog.json";

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

const sha = (s) => createHash("sha256").update(String(s)).digest();

/** Returns an error Response if the request is not authorised, otherwise null. */
export async function checkAuth(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return json({ error: "Admin password is not set up yet. Add ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy." }, 500);
  }
  const given = request.headers.get("x-admin-password") || "";
  if (!timingSafeEqual(sha(given), sha(expected))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down password guessing
    return json({ error: "Wrong password." }, 401);
  }
  return null;
}

/** Turns storage errors into a message the shop owner can act on. */
export function storageError(err) {
  const msg = String((err && err.message) || err);
  if (/token|store|BLOB|credentials|access denied/i.test(msg)) {
    return json({ error: "Photo & stock storage isn't connected yet. In Vercel open your project → Storage → create a Blob store and connect it to this project, then redeploy." }, 500);
  }
  return json({ error: "Storage error: " + msg }, 500);
}

const ID_RE = /^[a-z0-9-]{1,60}$/;
const BLOB_URL_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+$/i;
const LOCAL_PHOTO_RE = /^photos\/[\w.-]+$/;

const text = (v, max) => Array.from(String(v ?? "").trim()).slice(0, max).join("");

/** Validates and normalises the product list sent by the admin page. Throws with a readable message. */
export function cleanProducts(input) {
  if (!Array.isArray(input)) throw new Error("Product list is missing.");
  if (input.length > 500) throw new Error("Too many products (500 max).");
  const seen = new Set();
  return input.map((p, i) => {
    const label = `Product ${i + 1}${p && p.name ? ` (${text(p.name, 40)})` : ""}`;
    if (!p || typeof p !== "object") throw new Error(`${label} is invalid.`);
    const id = text(p.id, 60).toLowerCase();
    if (!ID_RE.test(id) || seen.has(id)) throw new Error(`${label} has an invalid or duplicate id.`);
    seen.add(id);
    const name = text(p.name, 80);
    if (!name) throw new Error(`${label} needs a name.`);
    const price = Number(p.price);
    if (!Number.isFinite(price) || price < 0 || price > 1e7) throw new Error(`${label} has an invalid price.`);
    const stock = Math.floor(Number(p.stock));
    if (!Number.isFinite(stock) || stock < 0 || stock > 1e7) throw new Error(`${label} has an invalid stock number.`);
    const image = text(p.image, 600);
    if (image && !BLOB_URL_RE.test(image) && !LOCAL_PHOTO_RE.test(image)) throw new Error(`${label} has an invalid photo link.`);
    const out = {
      id,
      name,
      category: text(p.category, 40) || "Other",
      unit: text(p.unit, 60),
      price: Math.round(price * 100) / 100,
      stock,
      emoji: text(p.emoji, 4) || "🧊",
    };
    if (image) out.image = image;
    return out;
  });
}
