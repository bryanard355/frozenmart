// POST /api/admin/login: checks the password and that storage is connected.
import { list } from "@vercel/blob";
import { json, checkAuth, storageError } from "../_lib.js";

export async function POST(request) {
  const denied = await checkAuth(request);
  if (denied) return denied;
  try {
    await list({ limit: 1 });
  } catch (err) {
    return storageError(err);
  }
  return json({ ok: true });
}
