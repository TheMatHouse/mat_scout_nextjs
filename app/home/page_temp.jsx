"use client";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* ✅ Hero Section */}
      <section className="w-full py-8 lg:pt-20 px-6 lg:px-24 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Hero Text */}
        <div className="lg:w-7/12 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            MatScout:{" "}
            <span className="text-red-600">Your Ultimate Grappling Hub</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Join the leading platform for grappling athletes and coaches. Track
            your matches, scout your opponents, and manage your teams — all in
            one intuitive dashboard. Whether you’re training for your next
            competition or building a winning team, MatScout gives you the tools
            to succeed.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Get Started
            </Link>
            <Link
              href="/learn-more"
              className="px-6 py-3 border border-gray-400 rounded-lg font-semibold hover:bg-gray-700 transition"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Right: Hero Image with Background Effects */}
        <div className="w-full lg:w-5/12 flex justify-center mt-6 lg:mt-0">
          <div className="relative w-full max-w-[640px] aspect-[3/2] flex justify-center items-center z-10">
            {/* 🔵/🔴 blobs: hide on <lg */}
            <div className="hidden lg:block absolute -top-32 -left-24 w-[420px] h-[420px] bg-[var(--ms-blue-gray)] rounded-full blur-[100px] opacity-30 z-0" />
            <div className="hidden lg:block absolute -bottom-20 -right-10 w-[380px] h-[380px] bg-[var(--ms-dark-red)] rounded-full blur-[100px] opacity-40 z-0" />

            {/* 🔴 wavy line: hide on <lg */}
            <svg
              viewBox="0 0 300 50"
              className="hidden lg:block absolute -top-12 left-1/4 w-[300px] h-[50px] z-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 25 C 75 0, 225 50, 300 25"
                stroke="var(--ms-light-red)"
                strokeWidth="6"
              />
            </svg>

            {/* 🔵 wavy line: hide on <lg */}
            <svg
              viewBox="0 0 300 50"
              className="hidden lg:block absolute top-20 left-0 w-[300px] h-[50px] z-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 25 C 75 50, 225 0, 300 25"
                stroke="var(--ms-blue-gray)"
                strokeWidth="6"
              />
            </svg>

            {/* Hero Image — always visible */}
            <div className="relative w-full h-full max-w-[600px] aspect-[3/2] z-10">
              <Image
                src="/assets/judo-throw-hero.png"
                alt="Judo Throw"
                fill
                sizes="(max-width: 1024px) 90vw, 600px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Features Section */}
      <section className="py-16 px-6 lg:px-20 bg-[var(--color-bg)]">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose MatScout?
        </h2>

        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              href: "/features#coaches",
              img: "/assets/coaches.png",
              title: "Coaches",
              desc: "Manage multiple teams effortlessly. Access all your athletes in one centralized location and elevate your coaching game.",
            },
            {
              href: "/features#athletes",
              img: "/assets/athletes.png",
              title: "Athletes",
              desc: "Keep a comprehensive record of your matches and performance. Analyze data to identify strengths and areas for improvement.",
            },
            {
              href: "/features#everyone",
              img: "/assets/community.png",
              title: "Everyone",
              desc: "Engage with a vibrant community in a secure, user-friendly platform. Whether you’re seasoned or new to the sport, there’s something for you.",
            },
          ].map((f) => (
            <FeatureCard
              key={f.title}
              {...f}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ href, img, title, desc }) {
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 hover:shadow-xl transition transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ms-light-red)]"
    >
      <div className="relative">
        {/* top accent bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[var(--ms-light-red)] rounded-t-md" />
        <Image
          src={img}
          alt={`${title} Image`}
          width={800}
          height={450}
          className="w-full h-auto object-cover rounded-t-md mb-4"
          priority={false}
        />
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:underline transition">
        {title}
      </h3>

      <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-4">
        {desc}
      </p>

      <div className="text-sm font-medium text-[var(--ms-light-red)] flex items-center justify-end transition group-hover:translate-x-1">
        Learn more →
      </div>
    </Link>
  );
}
