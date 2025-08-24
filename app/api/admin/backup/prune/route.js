export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

function toNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function listFiles(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const file = path.join(dir, ent.name);
    const stat = await fsp.stat(file);
    out.push({ file, name: ent.name, stat });
  }
  return out;
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const envDays = toNumber(process.env.BACKUP_RETENTION_DAYS, 30);
    const days = toNumber(url.searchParams.get("days"), envDays);
    const dir = process.env.BACKUP_DIR || "";

    if (!dir) {
      return ok({ error: "BACKUP_DIR is not set on the server." }, 400);
    }

    try {
      await fsp.access(dir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      return ok({ error: `BACKUP_DIR not readable/writable: ${dir}` }, 400);
    }

    const now = Date.now();
    const maxAgeMs = days * 86400000;

    const files = await listFiles(dir);
    const candidates = files.filter((f) => f.name.endsWith(".json.gz"));
    const examined = candidates.length;

    const deleted = [];
    const kept = [];
    const errors = [];

    for (const f of candidates) {
      const ageMs = now - f.stat.mtimeMs;
      if (ageMs > maxAgeMs) {
        if (dryRun) {
          deleted.push({
            file: f.file,
            bytes: f.stat.size,
            mtime: f.stat.mtime,
          });
        } else {
          try {
            await fsp.unlink(f.file);
            // also remove sidecar checksum if present (future-proof)
            const sha = f.file.replace(/\.json\.gz$/, ".json.gz.sha256");
            try {
              await fsp.unlink(sha);
            } catch {}
            deleted.push({
              file: f.file,
              bytes: f.stat.size,
              mtime: f.stat.mtime,
            });
          } catch (e) {
            errors.push({ file: f.file, error: e?.message || String(e) });
          }
        }
      } else {
        kept.push({ file: f.file, bytes: f.stat.size, mtime: f.stat.mtime });
      }
    }

    return ok({
      ok: true,
      dryRun,
      retentionDays: days,
      dir,
      examined,
      deletedCount: deleted.length,
      keptCount: kept.length,
      deleted,
      errors,
    });
  } catch (err) {
    console.error("Prune error:", err);
    return ok({ error: "Server error" }, 500);
  }
}
