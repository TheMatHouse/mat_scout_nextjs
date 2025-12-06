// app/teams/[slug]/scouting-reports/page.jsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import TeamUnlockGate from "@/components/teams/TeamUnlockGate";
import ClientPage from "./ClientPage";

export default async function ScoutingReportsPageWrapper({ params }) {
  const { slug } = await params;

  // 🛑 SERVER-SIDE AUTH CHECK
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/teams/${slug}`); // back to info tab
  }

  // ----------------------------------------------------------
  // ✅ Wrap entire content with TeamUnlockGate so the team
  //    password entered on dashboard page is reused here.
  // ----------------------------------------------------------
  return (
    <TeamUnlockGate slug={slug}>
      <ClientPage />
    </TeamUnlockGate>
  );
}
