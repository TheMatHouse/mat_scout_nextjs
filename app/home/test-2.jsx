"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const HomePage = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#050612] text-[var(--ms-light-gray)]">
      <Hero />

      {/* =============================
         Audience (3 cards only)
      ============================== */}
      <section className="relative px-6 lg:px-24 py-24 bg-[#050612]">
        <Heading
          title="Built for your whole team ecosystem"
          subtitle="Coaches, athletes, and families all stay aligned in one place — without spreadsheets, group chats, or chaos."
        />

        <div className="max-w-7xl mx-auto mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          <GlassCard
            title="Coaches"
            img="/assets/coaches.png"
            bullets={[
              "Manage teams, roles, and invitations",
              "Centralize scouting and match history",
              "Plan training and competition prep",
            ]}
            href="/features#coaches"
          />

          <GlassCard
            title="Athletes"
            img="/assets/athletes.png"
            bullets={[
              "Track matches and performance",
              "Review scouting and feedback",
              "Build confidence over time",
            ]}
            href="/features#athletes"
          />

          <GlassCard
            title="Families"
            img="/assets/community.png"
            bullets={[
              "Follow athlete progress",
              "Stay aligned on goals and events",
              "Support without overwhelm",
            ]}
            href="/features#everyone"
          />
        </div>
      </section>

      {/* =============================
         Why MatScout
      ============================== */}
      <section className="relative px-6 lg:px-24 pb-28 bg-[#050612]">
        <Heading
          title="Why MatScout"
          subtitle="MatScout was built for real gyms and real seasons — not generic fitness tracking."
        />

        <div className="max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <WhyBlock
            title="Everything in one place"
            text="Scouting reports, training notes, attendance, and competition history stay together — no more lost context."
          />
          <WhyBlock
            title="Built for teams"
            text="Invite coaches, athletes, and families with role-based access so everyone sees exactly what they should."
          />
          <WhyBlock
            title="Grows with you"
            text="From one athlete to a full club, MatScout scales without changing how you work."
          />
        </div>
      </section>
    </div>
  );
};

export default HomePage;

/* ===========================
   HERO
=========================== */

const Hero = () => {
  return (
    <section className="relative px-6 lg:px-24 pt-20 pb-28 overflow-hidden">
      <Nebula />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

      <div className="pointer-events-none absolute left-1/2 bottom-10 -translate-x-1/2 w-[1000px] h-[160px] blur-[26px] opacity-40 bg-gradient-to-r from-transparent via-[color:var(--ms-blue-gray)] to-transparent" />
      <div className="pointer-events-none absolute left-1/2 bottom-8 -translate-x-1/2 w-[900px] h-[140px] blur-[26px] opacity-35 bg-gradient-to-r from-transparent via-[color:var(--ms-light-red)] to-transparent" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            Track. Scout. Manage. <br />
            <span className="text-[var(--ms-light-red)]">
              All in one place.
            </span>
          </h1>

          <p className="mt-6 text-lg text-[var(--ms-nav-text)] max-w-2xl">
            MatScout helps grappling teams keep match history, scouting reports,
            and training notes organized so athletes improve faster and coaches
            stay in control.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-[var(--ms-light-red)] text-white font-semibold hover:brightness-110 transition"
            >
              Get started free
            </Link>

            <Link
              href="/features"
              className="px-6 py-3 rounded-xl border border-white/20 text-[var(--ms-light-gray)] hover:bg-white/10 transition"
            >
              Explore features →
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6">
          <HeroCarousel />
        </div>
      </div>
    </section>
  );
};

/* ===========================
   HERO CAROUSEL
=========================== */

function HeroCarousel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setI((v) => (v + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const slides = [<PracticeSlide />, <MatchSlide />, <ScoutingSlide />];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_50px_160px_rgba(0,0,0,0.7)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="text-sm font-semibold">MatScout Snapshot</div>
        <div className="flex gap-2">
          {[0, 1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setI(n)}
              className={`w-2.5 h-2.5 rounded-full ${
                i === n ? "bg-[var(--ms-light-red)]" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="p-6 min-h-[280px]">{slides[i]}</div>
    </div>
  );
}

/* ===========================
   HERO SLIDES
=========================== */

function PracticeSlide() {
  return (
    <div className="space-y-4">
      <span className="px-4 py-1 rounded-full bg-emerald-500 text-sm text-white font-semibold">
        JUDO · TECHNIQUE · PRACTICE
      </span>

      <div className="rounded-xl bg-white/8 border border-white/10 p-5 space-y-4">
        <div className="font-bold text-xl">Left-side Seoi-nage Entries</div>

        <div className="text-base text-[var(--ms-nav-text)]">
          Focus on breaking right-hand grip and entering drop seoi off movement.
        </div>

        <div className="flex justify-between text-sm text-[var(--ms-nav-text)] pt-2 border-t border-white/10">
          <span>Jan 12 · 7:00 PM</span>
          <span className="text-emerald-400">Video linked</span>
        </div>
      </div>
    </div>
  );
}

function MatchSlide() {
  return (
    <div className="space-y-4">
      <span className="px-4 py-1 rounded-full bg-emerald-500 text-sm text-white font-semibold">
        JUDO · WIN · IPPON
      </span>

      <div className="rounded-xl bg-white/8 border border-white/10 p-5 space-y-4">
        <div className="font-bold text-xl">Quarterfinal Match</div>

        <div className="grid grid-cols-2 gap-4 text-base text-[var(--ms-nav-text)]">
          <div>
            <div className="opacity-70">Winning throw</div>
            Ouchi-gari
          </div>
          <div>
            <div className="opacity-70">Time</div>
            2:28
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 text-sm text-[var(--ms-nav-text)]">
          Video and referee call available
        </div>
      </div>
    </div>
  );
}

function ScoutingSlide() {
  return (
    <div className="space-y-4">
      <span className="px-4 py-1 rounded-full bg-blue-500 text-sm text-white font-semibold">
        SCOUTING REPORT
      </span>

      <div className="rounded-xl bg-white/8 border border-white/10 p-5 text-base text-[var(--ms-nav-text)] space-y-3">
        <div className="font-semibold text-white">
          Grip Fighting & Ground Control
        </div>

        <p>
          Strong right-side throws and dominant transitions on the ground. Needs
          work on grip breaks and lateral movement.
        </p>
      </div>
    </div>
  );
}
