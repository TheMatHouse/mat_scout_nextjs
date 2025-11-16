// app/teams/[slug]/scouting-reports/page.jsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import ClientPage from "./ClientPage";

export default async function ScoutingReportsPageWrapper({ params }) {
  const { slug } = await params;

  // 🛑 SERVER-SIDE AUTH CHECK
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/teams/${slug}`); // back to info tab
  }

  // If logged in, render your client component
  return <ClientPage />;
}
