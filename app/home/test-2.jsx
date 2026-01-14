"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#070914] text-gray-100">
      <style
        jsx
        global
      >{`
        :root {
          --ms-red: var(--ms-light-red, #ff3c5a);
          --ms-blue: var(--ms-blue-gray, #5aa0ff);
        }

        @keyframes ms-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-2%, 1%, 0) scale(1.03);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes ms-pulse {
          0% {
            opacity: 0.55;
          }
          50% {
            opacity: 0.85;
          }
          100% {
            opacity: 0.55;
          }
        }
        @keyframes ms-shimmer {
          0% {
            transform: translateX(-12%) rotate(-8deg);
            opacity: 0.35;
          }
          50% {
            transform: translateX(6%) rotate(-8deg);
            opacity: 0.55;
          }
          100% {
            transform: translateX(-12%) rotate(-8deg);
            opacity: 0.35;
          }
        }

        .ms-tilt {
          transform: perspective(1200px) rotateY(-12deg) rotateX(6deg)
            rotateZ(-2deg);
        }
        .ms-tilt:hover {
  transform: perspective(1200px) rotateY(-12deg) rotateX(6deg)
    rotateZ(-2deg);
}
        }
      `}</style>

      {/* ========================= HERO ========================= */}
      <section className="relative px-6 lg:px-24 pt-16 lg:pt-24 pb-20 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#070914] via-[#120a20] to-[#070914]" />
          <div
            className="absolute inset-0"
            style={{
              animation: "ms-drift 10s ease-in-out infinite",
              background:
                "radial-gradient(900px 500px at 25% 30%, rgba(90,160,255,0.22), transparent 60%), radial-gradient(900px 520px at 78% 35%, rgba(255,60,90,0.20), transparent 62%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              The platform to{" "}
              <span className="text-[var(--ms-red)]">track</span>,{" "}
              <span className="text-[var(--ms-red)]">scout</span>, and{" "}
              <span className="text-[var(--ms-red)]">manage</span> grappling
              athletes.
            </h1>

            <p className="mt-6 text-lg text-gray-200 max-w-2xl">
              MatScout brings match history, scouting reports, team management,
              and training notes into one clean system — so your athletes
              improve faster.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-[var(--ms-red)] text-white font-semibold"
              >
                Get started free
              </Link>
              <Link
                href="/features"
                className="px-6 py-3 rounded-xl border border-white/20"
              >
                Explore features →
              </Link>
            </div>
          </div>

          {/* HERO IMAGE */}
          <div className="lg:col-span-6">
            <div className="ms-tilt will-change-transform">
              <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden bg-white/5">
                <Image
                  src="/assets/judo-throw-hero.png"
                  alt="Grappling throw"
                  fill
                  className="object-contain"
                />
              </div>

              {/* UPDATED MINI STATS */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <MiniStat
                  title="Practice Notes"
                  subtitle="Track every session"
                />
                <MiniStat
                  title="Scouting Reports"
                  subtitle="Study opponents"
                />
                <MiniStat
                  title="Team History"
                  subtitle="Build over time"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================= AUDIENCE ========================= */}
      <section className="relative px-6 lg:px-24 pt-10 pb-24">
        <HeadingBlock
          title="Built for your whole team ecosystem"
          subtitle="Start free, invite your team, and build a clean history of matches, notes, and reports."
        />

        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <AudienceCard
            title="Coaches"
            subtitle="Run your program"
            img="/assets/coaches.png"
            bullets={["Manage teams", "Centralize scouting", "Track prep"]}
            href="/features#coaches"
          />
          <AudienceCard
            title="Athletes"
            subtitle="Improve faster"
            img="/assets/athletes.png"
            bullets={["Log matches", "Review notes", "Build momentum"]}
            href="/features#athletes"
          />
          <AudienceCard
            title="Families"
            subtitle="Stay aligned"
            img="/assets/community.png"
            bullets={["Follow progress", "See updates", "Support"]}
            href="/features#everyone"
          />
        </div>
      </section>

      {/* =========================
    FINAL CALL TO ACTION
========================== */}
      <section className="relative px-6 lg:px-24 py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0c1f] via-[#120a20] to-[#070914]" />
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(900px_400px_at_50%_30%,rgba(255,60,90,0.25),transparent_70%)]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(900px_400px_at_50%_70%,rgba(90,160,255,0.25),transparent_70%)]" />
        </div>

        <div className="mx-auto max-w-5xl text-center space-y-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-100 leading-tight">
            Stop losing context.
            <br />
            <span className="text-[var(--ms-red)]">
              Start building your team’s history.
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            Every practice, every match, every scouting report — all in one
            place. Invite your team, log your sessions, and finally have a
            system that grows with your athletes.
          </p>

          <div className="flex flex-wrap justify-center gap-5 pt-6">
            <Link
              href="/register"
              className="px-8 py-4 rounded-2xl bg-[var(--ms-red)] text-white font-bold text-lg shadow-[0_20px_60px_rgba(255,60,90,0.45)] hover:brightness-110 transition"
            >
              Get started free
            </Link>

            <Link
              href="/features"
              className="px-8 py-4 rounded-2xl border border-white/20 bg-white/5 text-gray-100 font-semibold text-lg hover:bg-white/10 transition"
            >
              See how it works →
            </Link>
          </div>

          <div className="pt-10 text-sm text-gray-300">
            Free to start • No credit card • Built for real gyms
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- components ---------------- */

function HeadingBlock({ title, subtitle }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2 className="text-4xl font-extrabold">{title}</h2>
      <p className="mt-4 text-gray-200">{subtitle}</p>
    </div>
  );
}

function MiniStat({ title, subtitle }) {
  return (
    <div className="relative rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-white/30 transition">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-1 rounded-xl opacity-40 bg-gradient-to-r from-[rgba(90,160,255,0.25)] via-[rgba(255,60,90,0.25)] to-[rgba(168,85,247,0.25)] blur-lg" />

      <div className="relative">
        <div className="text-sm font-extrabold tracking-wide text-white">
          {title}
        </div>
        <div className="mt-1 text-xs text-gray-200">{subtitle}</div>
      </div>
    </div>
  );
}

/* AudienceCard stays exactly as you provided (already animated) */
function AudienceCard({ title, subtitle, img, bullets, href }) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/6 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_40px_140px_rgba(0,0,0,0.8)] hover:border-white/25"
    >
      <div className="pointer-events-none absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-r from-[rgba(90,160,255,0.45)] via-[rgba(255,60,90,0.45)] to-[rgba(168,85,247,0.35)] blur-xl" />

      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={img}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>

      <div className="relative p-6">
        <div className="text-xl font-extrabold">{title}</div>
        <div className="text-sm">{subtitle}</div>
        <ul className="mt-4 space-y-2 text-sm">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--ms-red)] mt-2" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
