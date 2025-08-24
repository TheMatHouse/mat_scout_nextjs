export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { dumpAll } from "@/lib/backup/dump";
import zlib from "zlib";

export async function GET(req) {
  // If you see 404: this file path is wrong or not deployed
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includeSensitive = searchParams.get("includeSensitive") === "true";

  const data = await dumpAll({ includeSensitive });
  const json = JSON.stringify(data);
  const gz = zlib.gzipSync(Buffer.from(json, "utf8"));

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `matscout-backup-${ts}${
    includeSensitive ? "-full" : ""
  }.json.gz`;

  return new NextResponse(gz, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
