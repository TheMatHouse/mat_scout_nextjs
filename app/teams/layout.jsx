export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";

export default async function TeamsLayout({ children }) {
  const me = await getCurrentUser();
  if (!me) {
    // Block access entirely until login.
    // After login, you can send them to the Teams hub.
    redirect(`/login?redirect=${encodeURIComponent("/teams")}`);
  }
  return <>{children}</>;
}
