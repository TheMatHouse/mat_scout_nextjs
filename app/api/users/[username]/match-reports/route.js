import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";

/* keep this tiny helper inline (same as DashboardMatches) */
const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : g === "coed" ? "Coed" : "";

const makeDivisionDisplay = (division, snapshot = "") => {
  // Prefer populated object (has gender)
  if (division && typeof division === "object") {
    const name = (
      division.name ||
      division.label ||
      division.code ||
      ""
    ).trim();
    const gw = genderWord(division.gender);
    if (name && gw) return `${name} — ${gw}`;
    if (name) return name;
  }
  // Fallback to any snapshot string already stored (and not an ObjectId)
  if (
    typeof snapshot === "string" &&
    snapshot &&
    !/^[0-9a-f]{24}$/i.test(snapshot)
  ) {
    return snapshot;
  }
  return "—";
};

export async function GET(_req, ctx) {
  try {
    await connectDB();

    const { username } = await ctx.params; // Next 15 requires awaiting params
    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Populate division so we have name + gender for proper labels
    const reports = await MatchReport.find({
      athleteId: user._id,
      athleteType: "user",
      isPublic: true,
    })
      .populate({ path: "division", select: "name label code gender" })
      .sort({ matchDate: -1 })
      .lean();

    // Add a reliable divisionDisplay on the server
    const hydrated = (reports || []).map((r) => {
      const snapshot = (
        r.divisionDisplay ||
        r.divisionLabel ||
        r.divisionName ||
        ""
      ).trim();
      const divisionDisplay = makeDivisionDisplay(r.division, snapshot);

      return {
        ...r,
        divisionDisplay,
      };
    });

    return NextResponse.json({ reports: hydrated });
  } catch (err) {
    console.error("❌ Error fetching match reports:", err);
    return NextResponse.json(
      { error: "Failed to fetch match reports." },
      { status: 500 }
    );
  }
}
