// POST /api/admin/upload?id=<product-id>: stores a product photo and returns its URL.
// The admin page shrinks photos before sending, so they stay well under Vercel's 4.5 MB request limit.
import { put } from "@vercel/blob";
import { json, checkAuth, storageError } from "../_lib.js";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request) {
  const denied = await checkAuth(request);
  if (denied) return denied;

  const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json({ error: "Please upload a JPG, PNG or WebP photo." }, 400);

  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) return json({ error: "The photo was empty." }, 400);
  if (buf.length > MAX_BYTES) return json({ error: "That photo is too large (4 MB max)." }, 400);

  const id = (new URL(request.url).searchParams.get("id") || "product")
    .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) || "product";

  try {
    const blob = await put(`photos/${id}.${ext}`, buf, {
      access: "public",
      addRandomSuffix: true, // every upload gets a new link, so browsers never show an old photo
      contentType: type,
    });
    return json({ url: blob.url });
  } catch (err) {
    return storageError(err);
  }
}
