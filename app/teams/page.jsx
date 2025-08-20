// app/teams/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search, PlusCircle, ChevronRight } from "lucide-react";

export default function TeamsLandingPage() {
  const [myCount, setMyCount] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/teams?page=1&limit=1&ts=${Date.now()}`);
        const data = await res.json();
        const count = Array.isArray(data?.myTeams) ? data.myTeams.length : 0;
        setMyCount(count);
      } catch {
        setMyCount(null);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Intro */}
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Teams
        </h1>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          Join your club or program to share reports and stay organized. If you
          don’t see your team yet, search for it—or create a new one in seconds.
        </p>
      </header>

      {/* Three Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <ActionCard
          href="/teams/mine"
          title="My Teams"
          description={
            myCount === null
              ? "View teams you belong to."
              : myCount === 0
              ? "You’re not on any teams yet."
              : `You’re on ${myCount} team${myCount === 1 ? "" : "s"}.`
          }
          icon={<Users className="w-5 h-5" />}
        />

        <ActionCard
          href="/teams/find"
          title="Find Teams"
          description="Search by name or location and request to join."
          icon={<Search className="w-5 h-5" />}
        />

        <ActionCard
          href="/teams/new"
          title="Create Team"
          description="Can’t find it? Start a new team for your club or school."
          icon={<PlusCircle className="w-5 h-5" />}
        />
      </section>
    </div>
  );
}

function ActionCard({ href, title, description, icon }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition block"
    >
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>

        {/* Fancy arrow (gradient ring + twin chevron slide) */}
        <div className="ml-auto rounded-full p-[2px] bg-gradient-to-tr from-gray-200/60 to-gray-400/60 dark:from-gray-700/60 dark:to-gray-500/60">
          <div className="relative inline-flex items-center justify-center rounded-full border border-border bg-white dark:bg-gray-800 p-2 transition-all group-hover:bg-gray-100 dark:group-hover:bg-gray-700 group-hover:shadow-sm">
            {/* base chevron */}
            <ChevronRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-[2px]"
              aria-hidden="true"
            />
            {/* trailing chevron that fades/slides in */}
            <ChevronRight
              className="w-4 h-4 absolute opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-[5px]"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </Link>
  );
}
