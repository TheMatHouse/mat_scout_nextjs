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
import { sendBackupNotification } from "@/lib/backup/notify";

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

    const form = await req.formData();
    const file = form.get("file");
    const dryRun = (form.get("dryRun") || "").toString() === "true";

    if (!file || typeof file.arrayBuffer !== "function") {
      return ok(
        { error: "No file uploaded. Please select a .json.gz backup." },
        400
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let json;
    try {
      const plain = zlib.gunzipSync(buf);
      json = JSON.parse(plain.toString("utf8"));
    } catch {
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

    const result = await applyRestore(data);

    // success notify
    const totals = (result?.results || []).reduce(
      (acc, r) => {
        if (r?.inserted) acc.inserted += r.inserted;
        return acc;
      },
      { inserted: 0 }
    );

    sendBackupNotification({
      event: "restore",
      ok: true,
      details: {
        collectionsUpdated: (result?.results || []).length,
        totalInserted: totals.inserted,
      },
    }).catch(() => {});

    return ok(result, 200);
  } catch (err) {
    console.error("Restore error:", err);
    sendBackupNotification({
      event: "restore",
      ok: false,
      details: { error: err?.message || String(err) },
    }).catch(() => {});
    return ok({ error: err?.message || "Server error" }, 500);
  }
}
