export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getGAClient, getGAPropertyPath, runGAReport } from "@/lib/gaData";

function ok(j, s = 200) {
  return NextResponse.json(j, { status: s });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    // will throw if misconfigured
    getGAClient();
    const property = getGAPropertyPath();

    const resp = await runGAReport({
      startDate: "7daysAgo",
      endDate: "today",
      metrics: [{ name: "totalUsers" }],
    });

    const totalUsers = Number(resp?.rows?.[0]?.metricValues?.[0]?.value || 0);

    return ok({
      ok: true,
      property,
      credentialEmail: process.env.GA_CLIENT_EMAIL,
      totalUsersLast7d: totalUsers,
      note: "If ok=true here, GA Data API is working.",
    });
  } catch (err) {
    return ok(
      {
        ok: false,
        error: err?.message || String(err),
        hints: [
          "GA4_PROPERTY_ID must be the numeric Property ID (not G-XXXX).",
          "Add GA_CLIENT_EMAIL to GA Admin → Property Access Management (Viewer/Analyst).",
          "Enable the Google Analytics Data API in your GCP project.",
          "Keep \\n escapes in GA_PRIVATE_KEY; code converts them to real newlines.",
          "This route runs with runtime=nodejs; don’t switch to edge.",
        ],
      },
      500
    );
  }
}
