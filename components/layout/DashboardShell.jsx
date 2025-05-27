"use client";

import { UserContext } from "@/context/UserContext";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";
import * as UserStuff from "@/context/UserContext";

export function DashboardShell({ user, children }) {
  console.log("UserStuff: ", UserStuff);
  return (
    <UserContext.Provider value={user}>
      <div className="flex">
        <AuthenticatedSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
