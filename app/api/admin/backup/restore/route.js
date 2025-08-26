export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import {
  previewRestore,
  applyRestore,
  parseBackupJSON,
} from "@/lib/backup/restore";
import zlib from "zlib";

/** Gate restore behind an env switch. Put RESTORE_ENABLE=true ONLY on staging. */
function isRestoreEnabled() {
  return String(process.env.RESTORE_ENABLE).toLowerCase() === "true";
}

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    if (!isRestoreEnabled()) {
      return ok({ error: "Restore is disabled on this environment." }, 403);
    }

    // We expect multipart form-data with:
    // - file: the .json.gz backup (plaintext)
    // (Advanced: you could add support for .enc + .meta.json here later)
    const form = await req.formData();
    const file = form.get("file");
    const dryRun = (form.get("dryRun") || "").toString() === "true";

    if (!file || typeof file.arrayBuffer !== "function") {
      return ok(
        { error: "No file uploaded. Please select a .json.gz backup." },
        400
      );
    }

    // Read and gunzip
    const buf = Buffer.from(await file.arrayBuffer());
    let json;
    try {
      const plain = zlib.gunzipSync(buf);
      json = JSON.parse(plain.toString("utf8"));
    } catch (e) {
      return ok(
        { error: "Failed to read backup. Expected a .json.gz file." },
        400
      );
    }

    const data = parseBackupJSON(json);

    if (dryRun) {
      const preview = await previewRestore(data);
      return ok(preview, 200);
    }

    // Apply restore (wipe-and-seed)
    const result = await applyRestore(data);
    return ok(result, 200);
  } catch (err) {
    console.error("Restore error:", err);
    return ok({ error: err?.message || "Server error" }, 500);
  }
}
