// app/api/records/all/route.js
import { NextResponse } from "next/server";
import { renderToReadableStream } from "@react-pdf/renderer";
import StyleRecordPDF from "@/components/pdf/StyleRecordPDF";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    new URL(req.url).origin;

  const cookie = req.headers.get("cookie") || "";

  // 👉 Adjust this path to your “fetch all match reports” API
  const res = await fetch(`${origin}/api/match-reports`, {
    headers: { cookie },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load match reports" },
      { status: 500 }
    );
  }

  const data = await res.json();

  // Expect something like:
  // { user: {...}, reports: [...], totals: { wins, losses } }
  const user = data.user || {};
  const totals = data.totals || {};
  const reports = Array.isArray(data.reports) ? data.reports : [];

  // If your API includes style info per report, use it; else optional.
  const rows = reports.map((r) => ({
    style: r.styleName || r.style?.styleName || r.style || "—",
    date: r.matchDate ? new Date(r.matchDate).toLocaleDateString() : "",
    eventName: r.eventName || "",
    opponent: r.opponentName || r.opponent || "",
    result: r.result || "",
    division: r.division || "",
    weight: r.weightClass || r.weightCategory || "",
  }));

  const wins = Number.isFinite(totals.wins)
    ? totals.wins
    : rows.filter((m) => (m.result || "").toUpperCase().startsWith("W")).length;
  const losses = Number.isFinite(totals.losses)
    ? totals.losses
    : rows.filter((m) => (m.result || "").toUpperCase().startsWith("L")).length;

  const userName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.username ||
    "User";

  const logoUrl =
    "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png";

  const stream = await renderToReadableStream(
    StyleRecordPDF({
      logoUrl,
      userName,
      styleName: "All Styles",
      wins,
      losses,
      matches: rows,
      includeStyleColumn: true, // show Style column on this one
    })
  );

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${
        user.username || "record"
      }-all-matches.pdf"`,
    },
  });
}
