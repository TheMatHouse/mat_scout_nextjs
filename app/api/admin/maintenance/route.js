// app/api/admin/maintenance/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import SiteConfig from "@/models/siteConfigModel";

function noStore(payload, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Optional admin GET for dashboard (returns normalized shape)
export async function GET() {
  try {
    await connectDB();
    const cfg = await SiteConfig.findOne(
      {},
      { maintenanceMode: 1, maintenanceMessage: 1, updatingMessage: 1 }
    ).lean();

    const maintenanceMode = cfg?.maintenanceMode ?? "off";
    const maintenanceMessage = cfg?.maintenanceMessage ?? "";
    const updatingMessage = cfg?.updatingMessage ?? "";

    return noStore({
      ok: true,
      maintenanceMode,
      maintenanceMessage,
      updatingMessage,
    });
  } catch (err) {
    return noStore(
      { ok: false, error: "server_error", detail: err?.message },
      500
    );
  }
}

// Toggle endpoint
export async function POST(req) {
  try {
    await connectDB();

    // --- Allow CI/Deploys via an admin key header (no session required) ---
    const ADMIN_KEY = process.env.ADMIN_MAINTENANCE_KEY || "";
    const headerKey = req.headers.get("x-admin-key") || "";

    // Session-based admin (browser) still allowed
    const me = await getCurrentUser();
    const isSessionAdmin = !!(me && (me.isAdmin || me.role === "admin"));

    if (
      !(ADMIN_KEY && headerKey && headerKey === ADMIN_KEY) &&
      !isSessionAdmin
    ) {
      return noStore({ ok: false, error: "forbidden" }, 403);
    }

    // Safe JSON parse
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const mode = body?.maintenanceMode ?? "off"; // "off" | "maintenance" | "updating"
    const maintenanceMessage =
      typeof body?.maintenanceMessage === "string"
        ? body.maintenanceMessage
        : undefined;
    const updatingMessage =
      typeof body?.updatingMessage === "string"
        ? body.updatingMessage
        : undefined;

    const update = {
      maintenanceMode: mode,
      updatedAt: new Date(),
    };
    if (maintenanceMessage !== undefined)
      update.maintenanceMessage = maintenanceMessage;
    if (updatingMessage !== undefined) update.updatingMessage = updatingMessage;
    if (isSessionAdmin && me?._id) update.updatedBy = me._id;

    const cfg = await SiteConfig.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return noStore({
      ok: true,
      maintenanceMode: cfg.maintenanceMode,
      maintenanceMessage: cfg.maintenanceMessage ?? "",
      updatingMessage: cfg.updatingMessage ?? "",
    });
  } catch (err) {
    return noStore(
      { ok: false, error: "server_error", detail: err?.message },
      500
    );
  }
}
