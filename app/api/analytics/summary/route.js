// app/api/analytics/summary/route.js
import { NextResponse } from "next/server";
// import your GA client here. Ensure credentials & scopes are set.

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "7d";

    // TODO: run your GA4 queries here, e.g.:
    // const summary = await fetchSummary(range);
    // const topPages = await fetchTopPages(range);
    // const topEvents = await fetchTopEvents(range);

    // For safety, coerce undefined to sane defaults:
    const payload = {
      summary: /* summary || */ null,
      topPages: /* topPages || */ [],
      topEvents: /* topEvents || */ [],
    };

    // If the underlying GA call returned 204/empty, we still send valid JSON:
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    // Always return JSON on error
    const message =
      err?.errors?.[0]?.message || err?.message || "Unknown analytics error.";

    return NextResponse.json(
      { error: message },
      { status: typeof err?.status === "number" ? err.status : 500 }
    );
  }
}
