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

function roleFor(name) {
  if (name.endsWith(".json.gz")) return "data_plain";
  if (name.endsWith(".json.gz.sha256")) return "sha_plain";
  if (name.endsWith(".json.gz.enc")) return "data_enc";
  if (name.endsWith(".json.gz.enc.sha256")) return "sha_enc";
  if (name.endsWith(".json.gz.enc.meta.json")) return "meta_enc";
  return "other";
}
function baseKey(name) {
  return name
    .replace(/\.json\.gz(\.enc)?(\.sha256)?(\.meta\.json)?$/, "")
    .trim();
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    const dir = process.env.BACKUP_DIR || "";
    if (!dir) return ok({ error: "BACKUP_DIR is not set on the server." }, 400);

    await fsp.mkdir(dir, { recursive: true });
    await fsp.access(dir, fs.constants.R_OK);

    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);

    // group by base (the timestamped backup id)
    const groups = new Map();
    for (const name of files) {
      const role = roleFor(name);
      if (role === "other") continue;
      const key = baseKey(name);
      const full = path.join(dir, name);
      const stat = await fsp.stat(full);

      if (!groups.has(key)) {
        groups.set(key, {
          base: key,
          encrypted: false,
          // "main" file info (either .json.gz or .json.gz.enc)
          dataName: null,
          dataBytes: 0,
          mtime: stat.mtime, // will be updated to main
          hasSha: false,
          hasMeta: false,
          shaName: null,
          metaName: null,
        });
      }
      const g = groups.get(key);
      if (role === "data_plain") {
        g.dataName = name;
        g.dataBytes = stat.size;
        g.mtime = stat.mtime;
        g.encrypted = false;
      } else if (role === "data_enc") {
        g.dataName = name;
        g.dataBytes = stat.size;
        g.mtime = stat.mtime;
        g.encrypted = true;
      } else if (role === "sha_plain" || role === "sha_enc") {
        g.hasSha = true;
        g.shaName = name;
      } else if (role === "meta_enc") {
        g.hasMeta = true;
        g.metaName = name;
      }
    }

    const list = Array.from(groups.values())
      .filter((g) => !!g.dataName) // only show groups with a data file
      .sort((a, b) => b.mtime - a.mtime)
      .map((g) => ({
        base: g.base,
        encrypted: g.encrypted,
        dataName: g.dataName,
        dataBytes: g.dataBytes,
        mtime: g.mtime,
        hasSha: g.hasSha,
        shaName: g.shaName,
        hasMeta: g.hasMeta,
        metaName: g.metaName,
      }));

    return ok({ ok: true, dir, count: list.length, backups: list });
  } catch (err) {
    console.error("List backups error:", err);
    return ok({ error: err?.message || "Server error" }, 500);
  }
}
