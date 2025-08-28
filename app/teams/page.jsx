"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  PlusCircle,
  ChevronRight,
  UserCheck,
  NotebookText,
  ThumbsUp,
  ShieldCheck,
} from "lucide-react";

export default function TeamsLandingPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [myCount, setMyCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then(
          (r) => r.json()
        );
        const isIn = !!me?.loggedIn;
        setLoggedIn(isIn);
        if (isIn) {
          const res = await fetch("/api/teams/mine/count", {
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            setMyCount(Number(data?.count || 0));
          }
        }
      } catch {
        setLoggedIn(false);
      }
    })();
  }, []);

  const createHref = loggedIn
    ? "/teams/new"
    : `/login?next=${encodeURIComponent("/teams/new")}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* HERO */}
      <header className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-6 shadow-sm">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Teams
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
          Join your club or program to organize match reports and stay
          connected. When you join a team, you’ll instantly see who else from
          your club is on MatScout, browse the member list, and (soon) discover
          teammates already registered for upcoming events. Share match reports
          with your team — likes and follows are rolling out.
        </p>

        {/* Feature chips */}
        <ul className="mt-4 flex flex-wrap gap-2">
          <FeatureChip
            icon={<UserCheck className="h-4 w-4" />}
            label="See teammates on MatScout"
          />
          <FeatureChip
            icon={<Users className="h-4 w-4" />}
            label="Member directory"
          />
          <FeatureChip
            icon={<NotebookText className="h-4 w-4" />}
            label="Share match reports"
          />
          <FeatureChip
            icon={<ThumbsUp className="h-4 w-4" />}
            label="Likes & follows (rolling out)"
          />
          <FeatureChip
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Privacy controls"
          />
        </ul>
      </header>

      {/* Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {loggedIn && (
          <ActionCard
            href="/teams/mine"
            title="My Teams"
            description={
              myCount === 0
                ? "You’re not on any teams yet."
                : `You’re on ${myCount} team${myCount === 1 ? "" : "s"}.`
            }
            icon={<Users className="w-5 h-5" />}
          />
        )}

        <ActionCard
          href="/teams/find"
          title="Find Teams"
          description="Search by name or location and request to join."
          icon={<Search className="w-5 h-5" />}
        />

        <ActionCard
          href={createHref}
          title="Create Team"
          description="Can’t find it? Start a new team for your club or school."
          icon={<PlusCircle className="w-5 h-5" />}
        />
      </section>
    </div>
  );
}

function FeatureChip({ icon, label }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 px-3 py-1 text-xs font-medium text-gray-800 dark:text-gray-200">
      {icon}
      <span>{label}</span>
    </li>
  );
}

function ActionCard({ href, title, description, icon }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition block"
    >
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>

        {/* Nice arrow */}
        <div className="ml-auto rounded-full p-[2px] bg-gradient-to-tr from-gray-200/60 to-gray-400/60 dark:from-gray-700/60 dark:to-gray-500/60">
          <div className="relative inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 transition-all group-hover:bg-gray-100 dark:group-hover:bg-gray-800 group-hover:shadow-sm">
            <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-[2px]" />
            <ChevronRight className="w-4 h-4 absolute opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-[5px]" />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </Link>
  );
}
