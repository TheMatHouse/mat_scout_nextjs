export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { getMyTeams } from "@/lib/teams/getMyTeams";

export async function GET() {
  const me = await getCurrentUserFromCookies().catch(() => null);
  if (!me?._id) return NextResponse.json({ count: 0 }, { status: 200 });
  const teams = await getMyTeams(me._id);
  return NextResponse.json({ count: teams.length }, { status: 200 });
}
