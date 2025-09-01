// app/dashboard/settings/page.jsx
"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Tags, ShieldCheck, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const isAdmin = !!user?.isAdmin;

  return (
    <div className="px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 mb-6">
          <p className="font-semibold">Admin access required</p>
          <p className="text-sm">
            If you think this is a mistake, contact an administrator.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Techniques tile (admin only) */}
        {isAdmin && (
          <Link
            href="/admin/settings/techniques"
            className="group block rounded-xl border p-5 hover:shadow-md transition bg-[var(--color-card)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <Tags className="w-5 h-5 text-[var(--ms-light-red)]" />
              <span className="text-base font-semibold">
                Techniques (Approve / Decline)
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Review user-submitted techniques. Approve to make them available
              as suggestions, or decline to remove them from the database.
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                className="group-hover:translate-x-1 transition"
              >
                Open
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Link>
        )}

        {/* Placeholder for future settings */}
        <div className="rounded-xl border p-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-semibold">More coming soon</span>
          </div>
          Configure organization-wide preferences and admin tools.
        </div>
      </div>
    </div>
  );
}
