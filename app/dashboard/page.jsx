"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import {
  CalendarPlus,
  Binoculars,
  UserCog,
  Users,
  CheckSquare,
  Square,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Spinner from "@/components/shared/Spinner";
import AthleteCheckIn from "@/components/attendance/AthleteCheckIn";

export default function DashboardHome() {
  const { user, loading } = useUser();
  const [matchCount, setMatchCount] = useState(null);
  const [scoutingCount, setScoutingCount] = useState(null);
  const [teamCount, setTeamCount] = useState(null);

  useEffect(() => {
    if (!user?._id) return;

    // Matches
    (async () => {
      try {
        const res = await fetch(
          `/api/dashboard/${user._id}/matchReports?ts=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setMatchCount(Array.isArray(data) ? data.length : 0);
        } else {
          setMatchCount(user.matchReports ? user.matchReports.length : 0);
        }
      } catch {
        setMatchCount(user.matchReports ? user.matchReports.length : 0);
      }
    })();

    // Scouting
    (async () => {
      try {
        const res = await fetch(
          `/api/dashboard/${user._id}/scoutingReports?ts=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setScoutingCount(Array.isArray(data) ? data.length : 0);
        } else {
          setScoutingCount(
            user.scoutingReports ? user.scoutingReports.length : 0
          );
        }
      } catch {
        setScoutingCount(
          user.scoutingReports ? user.scoutingReports.length : 0
        );
      }
    })();

    // Teams – use "my teams" endpoint so owner OR member both count
    (async () => {
      try {
        const res = await fetch(`/api/teams?limit=0&ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const count = Array.isArray(data?.myTeams) ? data.myTeams.length : 0;
          setTeamCount(count);
        } else {
          setTeamCount(user.teams ? user.teams.length : 0);
        }
      } catch {
        setTeamCount(user.teams ? user.teams.length : 0);
      }
    })();
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  const matchReady = matchCount !== null;
  const scoutingReady = scoutingCount !== null;
  const teamReady = teamCount !== null;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-12">
      {/* Hero */}
      <div className="bg-gradient-to-r from-ms-blue to-ms-dark-red rounded-2xl p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Copy */}
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {user.firstName}!
            </h1>
            <p className="text-lg">
              Track your matches, scout opponents, and manage your teams—all in
              one place.
            </p>
          </div>
        </div>

        {/* Secondary Action */}
        <div className="mt-6">
          <Link
            href="/dashboard/matches"
            className="inline-block bg-white/90 text-ms-blue font-semibold px-6 py-3 rounded-lg shadow hover:bg-white transition"
          >
            + Log a Match
          </Link>
        </div>
      </div>

      {/* Primary Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT: Stats (stacked) */}
        <div className="space-y-6">
          <StatCard
            title="Match Reports"
            value={matchReady ? matchCount : "—"}
            icon={<CalendarPlus className="w-6 h-6 text-ms-blue" />}
          />

          <StatCard
            title="Scouting Reports"
            value={scoutingReady ? scoutingCount : "—"}
            icon={<Binoculars className="w-6 h-6 text-ms-blue" />}
          />

          <StatCard
            title="Teams"
            value={teamReady ? teamCount : "—"}
            icon={<Users className="w-6 h-6 text-ms-blue" />}
          />
        </div>

        {/* RIGHT: Practice Check-In */}
        <div className="lg:col-span-2 flex justify-center">
          <div className="w-full max-w-xl">
            <AthleteCheckIn />
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          What's Next?
        </h2>
        <p className="text-gray-700 dark:text-gray-200 mb-4">
          Here are a few things you can do to get started:
        </p>

        <div className="space-y-2">
          <NextStepItem
            href="/dashboard/matches"
            label="Log your next match"
            checked={matchReady && Number(matchCount) > 0}
            loading={!matchReady}
          />
          <NextStepItem
            href="/dashboard/scouting"
            label="Create a scouting report"
            checked={scoutingReady && Number(scoutingCount) > 0}
            loading={!scoutingReady}
          />
          <NextStepItem
            href="/teams"
            label="Join or create a team"
            checked={teamReady && Number(teamCount) > 0}
            loading={!teamReady}
          />
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <DashboardCard
          href="/dashboard/matches"
          icon={
            <CalendarPlus className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
          }
          title="Match Reports"
          description="Log your past matches and track your improvement over time."
        />
        <DashboardCard
          href="/dashboard/scouting"
          icon={
            <Binoculars className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
          }
          title="Scouting Reports"
          description="Prepare for matchups by scouting athletes and analyzing styles."
        />
        <DashboardCard
          href="/dashboard/settings"
          icon={
            <UserCog className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
          }
          title="Profile & Settings"
          description="Customize your profile, update preferences, and manage your account."
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  const t = String(title).toLowerCase();

  const href = t.includes("match")
    ? "/dashboard/matches"
    : t.includes("scout")
    ? "/dashboard/scouting"
    : t.includes("team")
    ? "/teams"
    : null;

  const shouldLink = href && value !== "—";

  const valueNode = shouldLink ? (
    <Link
      href={href}
      className="underline underline-offset-4 decoration-2"
      style={{ color: "inherit", textDecorationColor: "currentColor" }}
      aria-label={`View ${title.toLowerCase()}`}
    >
      {value}
    </Link>
  ) : (
    value
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-200">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {valueNode}
        </h3>
      </div>
      {icon}
    </div>
  );
}

function DashboardCard({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white dark:bg-gray-900 shadow-md p-6 hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

/* ---------- Checklist row with animated check ---------- */
function NextStepItem({ href, label, checked, loading }) {
  const prevRef = useRef(checked);
  useEffect(() => {
    prevRef.current = checked;
  }, [checked]);
  const justCompleted = !prevRef.current && checked && !loading;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 p-3 rounded-lg transition ${
        loading ? "opacity-70" : "hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      aria-label={`${label}${checked ? " (completed)" : ""}`}
    >
      <AnimatePresence
        mode="popLayout"
        initial={false}
      >
        {checked ? (
          <motion.span
            key="checked"
            className="shrink-0 text-green-600"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: justCompleted ? 0.18 : 0.1 }}
            aria-hidden="true"
          >
            <CheckSquare className="w-5 h-5" />
          </motion.span>
        ) : (
          <motion.span
            key="unchecked"
            className="shrink-0 text-gray-400"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.1 }}
            aria-hidden="true"
          >
            <Square className="w-5 h-5" />
          </motion.span>
        )}
      </AnimatePresence>

      <span className="text-ms-blue dark:text-ms-light-gray group-hover:text-ms-dark-red">
        {label}
      </span>

      <span
        className={`ml-auto text-xs ${
          checked ? "text-green-600 dark:text-green-400" : "text-gray-500"
        }`}
        aria-live="polite"
      >
        {loading ? "Loading…" : checked ? "Completed" : "Get started"}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-ms-dark-red" />
      <span className="sr-only">
        {checked ? "(completed)" : "(not completed yet)"}
      </span>
    </Link>
  );
}
