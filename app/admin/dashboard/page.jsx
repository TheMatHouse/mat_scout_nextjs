// app/admin/dashboard/page.jsx
import Link from "next/link";
import {
  Users,
  Shield,
  FileText,
  Settings,
  UserPlus,
  ClipboardList,
  Search,
  BarChart3,
  StickyNote,
  HelpCircle,
  CheckCircle2,
  NotebookPen,
} from "lucide-react";

import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";
import ScoutingReport from "@/models/scoutingReportModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import AttendanceRecord from "@/models/attendanceRecordModel";
//import PracticeNote from "@/models/practiceNoteModel";

/* ---------------------------------------------
   Card primitives (unchanged)
---------------------------------------------- */

const CardShell = ({ children, interactive = false, label }) => {
  const base =
    "rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-between border transition-shadow bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700";
  const hover =
    "motion-safe:hover:shadow-lg motion-safe:dark:hover:shadow-black/20";
  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ms-light-red,#ef4444)] dark:focus-visible:ring-offset-gray-900";
  const className = interactive ? `${base} ${hover} ${focus}` : base;

  return (
    <div
      className={className}
      role={interactive ? undefined : "group"}
      aria-label={interactive ? undefined : label}
    >
      {children}
    </div>
  );
};

const StatTile = ({ label, value, Icon, href }) => {
  const Content = (
    <CardShell
      interactive={!!href}
      label={`${label}: ${value}`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <Icon
            size={24}
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm sm:text-[0.95rem] font-medium text-gray-900 dark:text-gray-100">
            {label}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            {String(value)}
          </h2>
        </div>
      </div>

      {href ? (
        <span className="inline-flex items-center gap-1 text-[var(--ms-light-red,#ef4444)] font-medium">
          <span className="underline underline-offset-2">Open</span>
          <span className="sr-only">{label}</span>
        </span>
      ) : null}
    </CardShell>
  );

  return href ? (
    <Link
      href={href}
      aria-label={`${label}: ${value}. Open`}
      className="block focus:outline-none"
    >
      {Content}
    </Link>
  ) : (
    <div className="block">{Content}</div>
  );
};

/* ---------------------------------------------
   Page
---------------------------------------------- */

const AdminDashboardPage = async () => {
  await connectDB();

  const [
    userCount,
    familyCount,
    teamCount,
    matchReportCount,
    scoutingReportCount,
    coachNotesCount,

    // Check-ins
    checkInTotal,
    checkInUsers,

    // Practice Notes
    practiceNoteTotal,
    practiceNoteUsers,
  ] = await Promise.all([
    User.countDocuments(),
    FamilyMember.countDocuments(),
    Team.countDocuments(),
    MatchReport.countDocuments(),
    ScoutingReport.countDocuments(),
    CoachMatchNote.countDocuments(),

    AttendanceRecord.countDocuments(),
    AttendanceRecord.distinct("athlete").then((u) => u.length),

    //PracticeNote.countDocuments(),
    //PracticeNote.distinct("user").then((u) => u.length),
  ]);

  const cards = [
    {
      label: "Total Users",
      value: userCount,
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Total Teams",
      value: teamCount,
      icon: Shield,
      href: "/admin/teams",
    },
    {
      label: "Family Members",
      value: familyCount,
      icon: UserPlus,
    },
    {
      label: "Match Reports",
      value: matchReportCount,
      icon: ClipboardList,
    },
    {
      label: "Scouting Reports",
      value: scoutingReportCount,
      icon: Search,
    },
    {
      label: "Coach’s Notes",
      value: coachNotesCount,
      icon: StickyNote,
    },

    /* ---------- NEW ---------- */

    {
      label: "Check-Ins",
      value: `${checkInTotal} / ${checkInUsers}`,
      icon: CheckCircle2,
    },
    // {
    //   label: "Practice Notes",
    //   value: `${practiceNoteTotal} / ${practiceNoteUsers}`,
    //   icon: NotebookPen,
    // },

    /* ------------------------- */

    {
      label: "Reports",
      value: "-",
      icon: FileText,
    },
    {
      label: "Analytics",
      value: "-",
      icon: BarChart3,
      href: "/admin/analytics",
    },
    {
      label: "Settings",
      value: "-",
      icon: Settings,
    },
    {
      label: "Manage FAQs",
      value: "-",
      icon: HelpCircle,
      href: "/admin/faqs",
    },
  ];

  return (
    <main className="relative w-full">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <p className="mb-6 sm:mb-8 text-gray-900 dark:text-gray-100/90">
          At-a-glance platform health and usage.
        </p>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {cards.map(({ label, value, icon: Icon, href }) => (
            <StatTile
              key={label}
              label={label}
              value={value}
              Icon={Icon}
              href={href}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default AdminDashboardPage;
