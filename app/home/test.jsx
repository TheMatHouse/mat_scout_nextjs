"use client";
import Image from "next/image";
import Link from "next/link";

/**
 * Premium Product Platform (neutral-forward) homepage.
 * Uses existing assets only.
 */

const HomePage = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* ================= BACKDROP ================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* soft grid / texture */}
        <div className="absolute inset-0 opacity-[0.10] dark:opacity-[0.18]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        {/* subtle accent wash (neutral-forward, red as accent) */}
        <div className="absolute -top-48 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full blur-[120px] opacity-20 dark:opacity-25 bg-[var(--ms-light-red)]" />
        <div className="absolute top-40 -left-56 h-[520px] w-[520px] rounded-full blur-[120px] opacity-10 dark:opacity-15 bg-[var(--ms-blue-gray)]" />
      </div>

      {/* ================= HERO ================= */}
      <section className="relative px-6 lg:px-24 pt-20 lg:pt-28 pb-16 lg:pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-6 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--ms-light-red)]" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Built for coaches, athletes, and teams
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-tight leading-[1.05] text-gray-900 dark:text-gray-100">
                A clean, modern home for your{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">grappling program</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-3 rounded-md bg-[var(--ms-light-red)]/20" />
                </span>
              </h1>

              <p className="text-lg sm:text-xl leading-relaxed max-w-xl text-gray-900 dark:text-gray-100 opacity-90">
                Track performance, organize team workflows, and scout opponents
                in one secure platform designed to feel simple — even when your
                program isn’t.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3.5 font-semibold bg-red-600 text-white hover:bg-red-700 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ms-light-red)]"
              >
                Get started
              </Link>

              <Link
                href="/features"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3.5 font-semibold border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-zinc-900/50 backdrop-blur hover:bg-white dark:hover:bg-zinc-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ms-light-red)]"
              >
                Explore features
              </Link>

              <div className="hidden sm:flex items-center gap-4 pl-2 text-sm text-gray-900 dark:text-gray-100 opacity-80">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                  Secure by design
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                  Built for real teams
                </div>
              </div>
            </div>
          </div>

          {/* Right: hero frame */}
          <div className="lg:col-span-6">
            <div className="relative">
              {/* frame */}
              <div className="relative rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden">
                {/* top chrome */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200/70 dark:border-gray-800/70">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                  </div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 opacity-70">
                    MatScout Dashboard Preview
                  </div>
                </div>

                {/* image */}
                <div className="relative w-full aspect-[16/10]">
                  <Image
                    src="/assets/judo-throw-hero.png"
                    alt="MatScout"
                    fill
                    sizes="(max-width: 1024px) 92vw, 720px"
                    className="object-contain p-6"
                    priority
                  />
                </div>

                {/* bottom strip */}
                <div className="px-5 py-4 border-t border-gray-200/70 dark:border-gray-800/70 flex flex-wrap items-center gap-3">
                  <Pill>Scouting</Pill>
                  <Pill>Teams</Pill>
                  <Pill>Attendance</Pill>
                  <Pill>Practice notes</Pill>
                  <div className="ml-auto text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Red accent, neutral design
                  </div>
                </div>
              </div>

              {/* subtle accent edge */}
              <div className="absolute -inset-1 rounded-[28px] bg-[var(--ms-light-red)]/10 blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= BENTO VALUE ================= */}
      <section className="relative px-6 lg:px-24 pb-10 lg:pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                Everything in one place
              </h2>
              <p className="text-gray-900 dark:text-gray-100 opacity-80 max-w-2xl">
                A professional workflow that scales from a small club to a full
                program — without feeling complicated.
              </p>
            </div>

            <Link
              href="/features"
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-zinc-900/50 backdrop-blur hover:bg-white dark:hover:bg-zinc-900 transition"
            >
              See everything →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <BentoCard className="lg:col-span-5">
              <BentoTitle>Coach-ready organization</BentoTitle>
              <BentoText>
                Run team operations in one dashboard: athletes, notes, sessions,
                and match history — with roles and access control.
              </BentoText>
              <BentoFooter>Designed for real coaching workflows</BentoFooter>
            </BentoCard>

            <BentoCard className="lg:col-span-7">
              <BentoTitle>Performance you can act on</BentoTitle>
              <BentoText>
                Turn training and competition data into clarity. Track what
                works, what doesn’t, and what to improve next.
              </BentoText>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniMetric
                  label="Scouting"
                  value="Faster prep"
                />
                <MiniMetric
                  label="Attendance"
                  value="Consistency"
                />
                <MiniMetric
                  label="Reports"
                  value="Better plans"
                />
                <MiniMetric
                  label="Teams"
                  value="Cleaner ops"
                />
              </div>
            </BentoCard>

            <BentoCard className="lg:col-span-7">
              <BentoTitle>Secure by design</BentoTitle>
              <BentoText>
                Your program data stays yours. Privacy and control are
                first-class features — not a checkbox.
              </BentoText>
              <BentoFooter>Built to earn trust</BentoFooter>
            </BentoCard>

            <BentoCard className="lg:col-span-5">
              <BentoTitle>Simple for athletes</BentoTitle>
              <BentoText>
                Athletes get a clean home for match history, training context,
                and development — with zero clutter.
              </BentoText>
              <BentoFooter>Easy to use on mobile</BentoFooter>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ================= FEATURE ROWS (WITH YOUR IMAGES) ================= */}
      <section className="relative px-6 lg:px-24 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto space-y-14">
          <FeatureRow
            title="Coaches"
            subtitle="Run the program like a pro"
            desc="Manage multiple teams, view athlete data, and keep everything organized without a messy spreadsheet workflow."
            img="/assets/coaches.png"
            href="/features#coaches"
            flip={false}
          />

          <FeatureRow
            title="Athletes"
            subtitle="Own your development"
            desc="Match history, performance context, and growth — presented cleanly so athletes can actually use it."
            img="/assets/athletes.png"
            href="/features#athletes"
            flip
          />

          <FeatureRow
            title="Teams & Families"
            subtitle="Everyone stays aligned"
            desc="Bring the right people into the loop — staff, teammates, and parents — with clear roles and a secure experience."
            img="/assets/community.png"
            href="/features#everyone"
            flip={false}
          />
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative px-6 lg:px-24 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">
                  Ready to make your program feel organized?
                </h3>
                <p className="text-gray-900 dark:text-gray-100 opacity-80 max-w-2xl">
                  Start free and build a home for your team that looks and feels
                  professional — in light mode and dark mode.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3.5 font-semibold bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
                >
                  Create an account
                </Link>

                <Link
                  href="/features"
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3.5 font-semibold border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-zinc-900/50 backdrop-blur hover:bg-white dark:hover:bg-zinc-900 transition"
                >
                  Browse features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ================= SMALL PARTS ================= */

const Pill = ({ children }) => {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-zinc-900/50 px-3 py-1 text-sm font-medium text-gray-900 dark:text-gray-100">
      {children}
    </span>
  );
};

const BentoCard = ({ className = "", children }) => {
  return (
    <div
      className={[
        "rounded-3xl border border-gray-200 dark:border-gray-800",
        "bg-white/70 dark:bg-zinc-900/60 backdrop-blur",
        "p-7 shadow-sm hover:shadow-[0_18px_50px_rgba(0,0,0,0.10)] transition",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

const BentoTitle = ({ children }) => {
  return (
    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </div>
  );
};

const BentoText = ({ children }) => {
  return (
    <p className="mt-2 text-gray-900 dark:text-gray-100 opacity-80 leading-relaxed">
      {children}
    </p>
  );
};

const BentoFooter = ({ children }) => {
  return (
    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 opacity-85">
      <span className="h-2 w-2 rounded-full bg-[var(--ms-light-red)]" />
      {children}
    </div>
  );
};

const MiniMetric = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-zinc-900/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100 opacity-70">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </div>
    </div>
  );
};

const FeatureRow = ({ title, subtitle, desc, img, href, flip }) => {
  return (
    <div
      className={[
        "grid grid-cols-1 lg:grid-cols-12 gap-8 items-center",
        flip ? "" : "",
      ].join(" ")}
    >
      <div
        className={["lg:col-span-6", flip ? "lg:order-2" : "lg:order-1"].join(
          " "
        )}
      >
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur overflow-hidden shadow-sm">
          <div className="relative w-full aspect-[16/10]">
            <Image
              src={img}
              alt={title}
              fill
              sizes="(max-width: 1024px) 92vw, 640px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          </div>

          <div className="px-6 py-5 flex items-center justify-between gap-4 border-t border-gray-200/70 dark:border-gray-800/70">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </div>
            <div className="h-1.5 w-14 rounded-full bg-[var(--ms-light-red)]/60" />
          </div>
        </div>
      </div>

      <div
        className={[
          "lg:col-span-6 space-y-4",
          flip ? "lg:order-1" : "lg:order-2",
        ].join(" ")}
      >
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 opacity-80">
          <span className="h-2 w-2 rounded-full bg-[var(--ms-light-red)]" />
          {title}
        </div>

        <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {subtitle}
        </h3>

        <p className="text-gray-900 dark:text-gray-100 opacity-80 leading-relaxed max-w-xl">
          {desc}
        </p>

        <Link
          href={href}
          className="inline-flex items-center gap-2 font-semibold text-red-600 hover:text-red-700 transition"
        >
          Learn more <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
