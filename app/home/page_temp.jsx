"use client";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-wrapper text-white min-h-screen w-full bg-[#101630]">
      {/* ✅ Hero Section */}
      <section className="bg-[#101630] w-full py-2 lg:py-2 px-6 lg:px-20 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Hero Text */}
        <div className="lg:w-7/12 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            MatScout:{" "}
            <span className="text-red-600">Your Ultimate Grappling Hub</span>
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed max-w-3xl">
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

        {/* Right: Hero Image */}
        <div className="lg:w-5/12 flex justify-center">
          <Image
            src="/assets/judo-throw-hero.png"
            alt="Judo Throw"
            width={600}
            height={500}
            className="object-contain"
            priority
          />
        </div>
      </section>

      {/* ✅ Features Section */}
      <section className="bg-[#101630] py-2 px-6 lg:px-20">
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
    <div className="bg-white text-black rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition">
      <div className="w-full h-48 relative">
        <Image
          src={img}
          alt={title}
          fill
          className="object-cover"
        />
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
