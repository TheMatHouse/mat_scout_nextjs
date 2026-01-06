import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import FlyerDocument from "./FlyerDocument";

export const dynamic = "force-dynamic";

export async function GET(req, context) {
  await connectDB();

  const { slug } = await context.params;

  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team) {
    return new NextResponse("Team not found", { status: 404 });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/teams/${slug}/social-invite`;

  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 600,
    margin: 2,
  });

  const pdfBuffer = await pdf(
    <FlyerDocument
      teamName={team.teamName}
      qrDataUrl={qrDataUrl}
    />
  ).toBuffer();

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${team.teamSlug}-team-flyer.pdf"`,
    },
  });
}
