// app/api/admin/backup/save/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { dumpAll } from "@/lib/backup/dump";
import zlib from "zlib";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    const { searchParams } = new URL(req.url);
    const includeSensitive = searchParams.get("includeSensitive") === "true";

    const dir = process.env.BACKUP_DIR || "";
    if (!dir) {
      return ok(
        {
          error:
            "BACKUP_DIR is not set. Configure a writable folder on your server (e.g., /var/backups/matscout).",
        },
        400
      );
    }

    // Ensure folder exists and is writable
    try {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.access(dir, fs.constants.W_OK);
    } catch (e) {
      return ok(
        {
          error: `Backup directory not writable: ${dir}. (${e?.message || e})`,
        },
        400
      );
    }

    const data = await dumpAll({ includeSensitive });
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(data), "utf8"));

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `matscout-backup-${ts}${
      includeSensitive ? "-full" : ""
    }.json.gz`;
    const filePath = path.join(dir, filename);

    await fsp.writeFile(filePath, gz);

    return ok({
      ok: true,
      path: filePath,
      bytes: gz.length,
    });
  } catch (err) {
    console.error("Save backup error:", err);
    return ok({ error: err?.message || "Server error" }, 500);
  }
}
