export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

function badName(name) {
  return (
    !name || name.includes("/") || name.includes("\\") || name.startsWith(".")
  );
}
function contentType(name) {
  if (name.endsWith(".json.gz")) return "application/gzip";
  if (name.endsWith(".sha256")) return "text/plain; charset=utf-8";
  if (name.endsWith(".meta.json")) return "application/json; charset=utf-8";
  // encrypted blob
  if (name.endsWith(".json.gz.enc")) return "application/octet-stream";
  return "application/octet-stream";
}

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const name = url.searchParams.get("name"); // exact filename
    if (badName(name)) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const dir = process.env.BACKUP_DIR || "";
    if (!dir) return new NextResponse("BACKUP_DIR not set", { status: 400 });

    const filePath = path.join(dir, name);
    await fsp.access(filePath, fs.constants.R_OK);

    const data = await fsp.readFile(filePath);
    const headers = {
      "Content-Type": contentType(name),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    };
    return new NextResponse(data, { status: 200, headers });
  } catch (err) {
    console.error("Get backup file error:", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
