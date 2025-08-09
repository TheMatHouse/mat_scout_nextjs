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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            img="/assets/coaches.png"
            title="Coaches"
            description="Manage multiple teams effortlessly. Access all your athletes in one centralized location and elevate your coaching game."
          />
          <FeatureCard
            img="/assets/athletes.png"
            title="Athletes"
            description="Keep a comprehensive record of your matches and performance. Analyze data to identify strengths and areas for improvement."
          />
          <FeatureCard
            img="/assets/community.png"
            title="Community"
            description="Engage with a vibrant community of grapplers, share knowledge, and grow together in a secure and inspiring environment."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ img, title, description }) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl shadow-md p-6 flex flex-col items-center text-center">
      <div className="relative w-full h-[200px] mb-4">
        <Image
          src={img}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 300px"
          className="object-contain"
        />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
