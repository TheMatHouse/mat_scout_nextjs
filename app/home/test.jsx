// app/home/page.jsx  (updated for your palette)
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function HomePage() {
  const demoBtnRef = useRef(null);

  // Animate feature cards when they enter viewport
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) =>
          e.target.classList.toggle("is-visible", e.isIntersecting)
        ),
      { threshold: 0.25 }
    );
    document.querySelectorAll(".fade-up").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* ---------- HERO ---------- */}
      {/* ---------- HERO (updated buttons + accent words) ---------- */}
      <section className="relative isolate flex items-center justify-center px-6 pt-24 pb-32 lg:pt-32 lg:pb-40">
        {/* subtle tatami texture */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[var(--color-bg)]">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 opacity-40" />
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.03]"
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
          >
            <defs>
              <pattern
                id="tatami"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <rect
                  width="40"
                  height="40"
                  fill="none"
                />
                <path
                  d="M0 20h40M20 0v40"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#tatami)"
            />
          </svg>
        </div>

        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: copy */}
          <div className="flex flex-col justify-center text-center lg:text-left">
            <h1 className="text-5xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-6xl lg:text-7xl">
              Track. Scout.{" "}
              <span className="text-[var(--ms-light-red)]">Dominate.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-[var(--color-text)]/80">
              The all-in-one hub for{" "}
              <span className="inline-block">
                <span className="animate-cycle text-[var(--ms-light-red)]">
                  Judo
                </span>{" "}
                •{" "}
                <span className="animate-cycle animation-delay-1000 text-[var(--ms-light-red)]">
                  BJJ
                </span>{" "}
                •{" "}
                <span className="animate-cycle animation-delay-2000 text-[var(--ms-light-red)]">
                  Wrestling
                </span>
              </span>{" "}
              athletes and coaches. Log matches, build scouting reports, and
              grow your program—faster than ever.
            </p>

            <div className="mt-10 flex flex-wrap gap-4 justify-center lg:justify-start">
              {/* RED primary CTA */}
              <Link
                href="/signup"
                className="rounded-lg bg-[var(--ms-light-red)] px-5 py-3 text-base font-semibold text-[var(--ms-nav-text)] shadow-lg hover:bg-[var(--ms-dark-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ms-light-red)]"
              >
                Start Free
              </Link>
              {/* Subtle secondary CTA */}
              <button
                ref={useRef(null)}
                onClick={() => alert("Demo modal placeholder")}
                className="rounded-lg bg-white/10 px-5 py-3 text-base font-semibold text-[var(--color-text)] ring-1 ring-inset ring-white/20 hover:bg-white/20"
              >
                Watch 60-s Demo
              </button>
            </div>
          </div>

          {/* Right: phone mock (unchanged) */}
          <div className="relative mx-auto w-full max-w-sm lg:mx-0">
            <div className="relative z-10 rounded-[2.5rem] bg-black p-3 shadow-2xl">
              <div className="rounded-[2rem] bg-[var(--color-card)] p-6 ring-1 ring-white/10">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--ms-light-red)]">
                    MatScout
                  </span>
                  <span className="text-xs text-[var(--color-text)]/60">
                    2 min ago
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">John Doe</p>
                        <p className="text-sm text-[var(--color-text)]/60">
                          77 kg • Blue Belt
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">W 5-2</p>
                        <p className="text-xs text-green-400">Points</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Jane Smith</p>
                        <p className="text-sm text-[var(--color-text)]/60">
                          63 kg • Purple Belt
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">W 8-0</p>
                        <p className="text-xs text-green-400">Technical</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <span className="absolute -inset-4 block rounded-full bg-[var(--ms-light-red)]/30 blur-2xl" />
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      {/* ---------- FEATURES (with images) ---------- */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Track",
              body: "Log every throw, takedown, and submission. Visual dashboards show progress across seasons.",
              svg: (
                <svg
                  viewBox="0 0 640 360"
                  className="h-auto w-full rounded-xl object-cover"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    width="640"
                    height="360"
                    fill="#edf2f4"
                  />
                  <path
                    d="M0 180h640M320 0v360"
                    stroke="#8d99ae"
                    strokeWidth="2"
                    opacity=".4"
                  />
                  <circle
                    cx="320"
                    cy="180"
                    r="60"
                    fill="#2b2d42"
                  />
                  <text
                    x="320"
                    y="188"
                    textAnchor="middle"
                    className="fill-[var(--ms-nav-text)] text-[28px] font-bold"
                    fontFamily="Roboto, sans-serif"
                  >
                    TRACK
                  </text>
                </svg>
              ),
            },
            {
              title: "Scout",
              body: "Build opponent profiles with video links, notes, and historical match data in seconds.",
              svg: (
                <svg
                  viewBox="0 0 640 360"
                  className="h-auto w-full rounded-xl object-cover"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    width="640"
                    height="360"
                    fill="#edf2f4"
                  />
                  <rect
                    x="120"
                    y="80"
                    width="400"
                    height="200"
                    rx="12"
                    fill="#fff"
                    stroke="#8d99ae"
                    strokeWidth="2"
                  />
                  <circle
                    cx="180"
                    cy="140"
                    r="24"
                    fill="#2b2d42"
                  />
                  <rect
                    x="220"
                    y="126"
                    width="200"
                    height="12"
                    rx="6"
                    fill="#8d99ae"
                  />
                  <rect
                    x="220"
                    y="150"
                    width="160"
                    height="10"
                    rx="5"
                    fill="#c3ccd9"
                  />
                  <text
                    x="320"
                    y="260"
                    textAnchor="middle"
                    className="fill-[var(--ms-light-red)] text-[24px] font-bold"
                    fontFamily="Roboto, sans-serif"
                  >
                    SCOUT
                  </text>
                </svg>
              ),
            },
            {
              title: "Grow",
              body: "Share public profiles with recruiters and fans. Grow your club with built-in analytics.",
              svg: (
                <svg
                  viewBox="0 0 640 360"
                  className="h-auto w-full rounded-xl object-cover"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    width="640"
                    height="360"
                    fill="#edf2f4"
                  />
                  <path
                    d="M80 280 L160 200 L240 240 L320 160 L400 220 L480 180 L560 260"
                    stroke="#2b2d42"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="160"
                    cy="200"
                    r="8"
                    fill="#ef233c"
                  />
                  <circle
                    cx="240"
                    cy="240"
                    r="8"
                    fill="#ef233c"
                  />
                  <circle
                    cx="320"
                    cy="160"
                    r="8"
                    fill="#ef233c"
                  />
                  <circle
                    cx="400"
                    cy="220"
                    r="8"
                    fill="#ef233c"
                  />
                  <circle
                    cx="480"
                    cy="180"
                    r="8"
                    fill="#ef233c"
                  />
                  <text
                    x="320"
                    y="320"
                    textAnchor="middle"
                    className="fill-[var(--ms-blue)] text-[24px] font-bold"
                    fontFamily="Roboto, sans-serif"
                  >
                    GROW
                  </text>
                </svg>
              ),
            },
          ].map((f) => (
            <div
              key={f.title}
              className="fade-up flex flex-col gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
            >
              {f.svg}
              <div>
                <h3 className="text-xl font-semibold text-[var(--ms-light-red)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-[var(--color-text)]/80">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CSS ANIMATIONS (inline to avoid extra file) ---------- */}
      <style jsx>{`
        .animate-cycle {
          display: inline-block;
          animation: cycle 3s ease-in-out infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes cycle {
          0%,
          33.33% {
            opacity: 1;
          }
          33.34%,
          100% {
            opacity: 0.3;
          }
        }

        .fade-up {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .fade-up.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}
