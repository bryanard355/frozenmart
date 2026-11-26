// Shared helpers for the API functions. Files starting with "_" are not exposed as endpoints.
import { createHash, timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";

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

/** Turns storage errors into a message the shop owner can act on (always includes the real reason). */
export function storageError(err) {
  const msg = String((err && err.message) || err).slice(0, 300);
  if (/No token found|BLOB_READ_WRITE_TOKEN|BLOB_STORE_ID|OIDC|unable to extract store/i.test(msg)) {
    return json({ error: "Storage isn't connected to this project. In Vercel open frozenmart → Storage, connect your Blob store to this project, then redeploy. (" + msg + ")" }, 500);
  }
  return json({ error: "Storage error: " + msg }, 500);
}

// ---------- Blob access (works with both public and private stores) ----------
// A Blob store is either public or private. We learn which on the first successful call.
let accessMode = null; // "public" | "private"
const modes = () => (accessMode ? [accessMode] : ["private", "public"]);

/** Writes a blob, trying the store's access mode. Returns the put() result plus the mode used. */
export async function putBlob(path, body, options) {
  const errors = [];
  for (const mode of modes()) {
    try {
      const res = await put(path, body, { ...options, access: mode });
      accessMode = mode;
      return { ...res, access: mode };
    } catch (err) {
      errors.push(err);
    }
  }
  if (errors.length === 1) throw errors[0];
  // Both modes failed: report both reasons so the real problem is visible.
  throw new Error(errors.map((e, i) => `${["private", "public"][i]} → ${(e && e.message) || e}`).join(" | "));
}

/** Reads a blob. fresh=true reads the latest copy (consistent reads on private stores). Returns null if missing. */
export async function readBlob(path, fresh) {
  let lastErr = null;
  const tried = modes();
  for (const mode of tried) {
    try {
      const res = await get(path, { access: mode, ...(fresh ? { useCache: false } : {}) });
      if (res && res.statusCode === 200 && res.stream) {
        accessMode = mode;
        return res;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr && tried.length === 1) throw lastErr;
  return null;
}

/** The link the site uses to show an uploaded photo. Private photos are served through /api/photo. */
export function photoLink(putResult) {
  return putResult.access === "private" ? "/api/photo?p=" + putResult.pathname : putResult.url;
}
/** Store pathname for a photo link (for tidying up unused photos). */
export function photoPath(link) {
  if (!link) return "";
  if (link.startsWith("/api/photo?p=")) return link.slice("/api/photo?p=".length);
  try { return decodeURIComponent(new URL(link).pathname.slice(1)); } catch { return link; }
}

const ID_RE = /^[a-z0-9-]{1,60}$/;
const BLOB_URL_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+$/i;
const LOCAL_PHOTO_RE = /^photos\/[\w.-]+$/;
const PRIVATE_PHOTO_RE = /^\/api\/photo\?p=photos\/[\w.-]+$/;

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
    // Photos: "images" (list, first = cover). Older saves used a single "image".
    const rawImages = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
    if (rawImages.length > 8) throw new Error(`${label} has too many photos (8 max).`);
    const images = [...new Set(rawImages.map((v) => text(v, 600)).filter(Boolean))];
    for (const img of images) {
      if (!BLOB_URL_RE.test(img) && !LOCAL_PHOTO_RE.test(img) && !PRIVATE_PHOTO_RE.test(img)) throw new Error(`${label} has an invalid photo link.`);
    }
    const out = {
      id,
      name,
      category: text(p.category, 40) || "Other",
      unit: text(p.unit, 60),
      price: Math.round(price * 100) / 100,
      stock,
      emoji: text(p.emoji, 4) || "🧊",
    };
    if (images.length) {
      out.images = images;
      out.image = images[0]; // kept for older pages
    }
    return out;
  });
}
