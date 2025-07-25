"use client";

import Image from "next/image";
import TrophyRed from "@/assets/images/icons/trophy-red.png"; // optional
import TeamRed from "@/assets/images/icons/team-red.png"; // optional

export default function AboutClient() {
  return (
    <div className="w-full px-4 sm:px-8 md:px-12 lg:px-24 py-16 flex justify-center">
      <div className="w-full max-w-screen-xl text-gray-800 dark:text-white">
        <div className="space-y-16">
          {/* Heading */}
          <header className="text-center">
            <h1 className="text-4xl font-bold mb-4">About MatScout</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Welcome to MatScout, your one-stop platform for tracking your
              grappler&apos;s performance!
            </p>
          </header>

          {/* Section: Who We Are */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-ms-light-red">
              Who We Are
            </h2>
            <p className="text-gray-700 dark:text-white/90">
              MatScout is a dedicated platform designed for grappling athletes,
              coaches, and sports enthusiasts. Our mission is to provide a
              comprehensive solution for tracking, analyzing, and improving a
              grappler&apos;s performance.
            </p>
          </section>

          {/* Section: What We Do */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-ms-light-red">
              What We Do
            </h2>
            <p className="text-gray-700 dark:text-white/90">
              At MatScout, we believe in the power of data. Our platform allows
              athletes to join teams, track their performance, and compare their
              stats with competitors. Coaches can manage their teams, monitor
              athletes&apos; progress, and make data-driven decisions to enhance
              their team&apos;s performance.
            </p>
          </section>

          {/* Section: Why Choose Us */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-ms-light-red">
              Why Choose Us
            </h2>
            <p className="text-gray-700 dark:text-white/90">
              With MatScout, you get more than just a performance tracking tool.
              You become part of the grappling community that is passionate
              about sports and committed to excellence. Our platform is
              user-friendly, secure, and designed to help you reach your full
              potential.
            </p>
          </section>

          {/* Section: Join Us */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-ms-light-red">
              Join Us
            </h2>
            <p className="text-gray-700 dark:text-white/90">
              Whether you&apos;re an athlete looking to improve, a coach seeking
              to lead your team to victory, or a sports enthusiast wanting to
              follow your favorite athletes, MatScout has something for you.
              Sign up today and start your journey to greatness with us!
            </p>
            <p className="text-gray-700 dark:text-white/90">
              Thank you for visiting MatScout. We look forward to being a part
              of your sports journey!
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
