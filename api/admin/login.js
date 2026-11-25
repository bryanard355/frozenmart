// POST /api/admin/login: checks the password and that storage is reachable.
import { head } from "@vercel/blob";
import { json, checkAuth, storageError, CATALOG_PATH } from "../_lib.js";

export async function POST(request) {
  const denied = await checkAuth(request);
  if (denied) return denied;
  try {
    await head(CATALOG_PATH); // cheap check; "not found" still means storage is connected
  } catch (err) {
    if (!/does not exist|not found/i.test(String(err && err.message))) return storageError(err);
  }
  return json({ ok: true });
}
