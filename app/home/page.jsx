"use client";

import Link from "next/link";
import Image from "next/image";
import homeTeamImage from "@/assets/images/home/home_team.png";
import homeAthleteImage from "@/assets/images/home/home_athlete.png";
import homeCompetitorImage from "@/assets/images/home/home_competitor.png";

export default function HomePage() {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[var(--ms-blue)] to-[var(--ms-blue-gray)] text-white py-10 px-6 text-center rounded-xl shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
            MatScout: Your Ultimate Grappling Hub
          </h1>
          <p className="text-lg sm:text-xl max-w-3xl mx-auto mb-6">
            Built for coaches and athletes. Analyze matches, manage teams, and
            grow together.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[var(--ms-light-red)] hover:bg-[var(--ms-dark-red)] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition"
          >
            Get Started
          </Link>
        </section>

        <section className="max-w-7xl mx-auto mt-16 px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              href: "/features#coaches",
              image: homeTeamImage,
              title: "Coaches",
              desc: "Manage multiple teams effortlessly. Access all your athletes in one centralized location. Stay organized and elevate your coaching game with MatScout’s intuitive team management features.",
            },
            {
              href: "/features#athletes",
              image: homeAthleteImage,
              title: "Athletes",
              desc: "Keep a comprehensive record of all your matches in one convenient location. Dive into performance analysis to identify strengths and areas for improvement. Elevate your grappling game with MatScout!",
            },
            {
              href: "/features#everyone",
              image: homeCompetitorImage,
              title: "Everyone",
              desc: "Engage with our vibrant community, enjoy a secure and private experience, and explore our user-friendly platform. Whether you’re a seasoned enthusiast or new to the sport, MatScout has something for everyone!",
            },
          ].map(({ href, image, title, desc }, idx) => (
            <Link
              key={idx}
              href={href}
              className="group bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 hover:shadow-xl transition transform hover:-translate-y-1"
            >
              <div className="relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-[var(--ms-light-red)] rounded-t-md" />
                <Image
                  src={image}
                  alt={`${title} Image`}
                  className="w-full object-cover rounded-t-md mb-4"
                />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:underline transition">
                {title}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-4">
                {desc}
              </p>
              <div className="text-sm font-medium text-[var(--ms-light-red)] flex items-center justify-end transition group-hover:translate-x-1">
                Learn more →
              </div>
            </Link>
          ))}
        </section>

        {/* CTA Footer */}
        <section className="mt-20 text-center px-6">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-[var(--ms-blue)] dark:text-[var(--ms-light-gray)]">
            Ready to elevate your grappling journey?
          </h3>
          <Link
            href="/register"
            className="inline-block bg-[var(--ms-light-red)] hover:bg-[var(--ms-dark-red)] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition"
          >
            Join MatScout Now
          </Link>
        </section>
      </div>
    </div>
  );
}
