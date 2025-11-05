export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import SiteConfig from "@/models/siteConfigModel";

export async function GET() {
  try {
    await connectDB();
    const cfg = await SiteConfig.findOne(
      {},
      { maintenanceMode: 1, maintenanceMessage: 1, updatingMessage: 1 }
    ).lean();
    const payload = cfg || { maintenanceMode: "off" };
    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Tiny TTL so middleware isn’t too chatty but still feels instant
        "cache-control": "no-store",
      },
    });
  } catch {
    // Fail-safe: if config can't be read, do NOT block the site
    return NextResponse.json({ maintenanceMode: "off" }, { status: 200 });
  }
}
