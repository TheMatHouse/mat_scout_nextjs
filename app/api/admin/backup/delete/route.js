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
function sanitizeBase(base) {
  if (
    !base ||
    base.includes("/") ||
    base.includes("\\") ||
    base.startsWith(".")
  )
    return null;
  return base;
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const base = sanitizeBase(body?.base);
    if (!base) return ok({ error: "Invalid base id" }, 400);

    const dir = process.env.BACKUP_DIR || "";
    if (!dir) return ok({ error: "BACKUP_DIR not set" }, 400);

    // candidates for deletion (both plaintext and encrypted variants)
    const names = [
      `${base}.json.gz`,
      `${base}.json.gz.sha256`,
      `${base}.json.gz.enc`,
      `${base}.json.gz.enc.sha256`,
      `${base}.json.gz.enc.meta.json`,
    ];

    const deleted = [];
    for (const name of names) {
      const p = path.join(dir, name);
      try {
        await fsp.unlink(p);
        deleted.push(name);
      } catch {
        // ignore missing
      }
    }

    return ok({ ok: true, base, deleted });
  } catch (err) {
    console.error("Delete backup error:", err);
    return ok({ error: err?.message || "Server error" }, 500);
  }
}
