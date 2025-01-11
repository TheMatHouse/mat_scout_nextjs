import React from "react";

const AboutPage = () => {
  return (
    <div className="grid grid-rows-[2px_1fr_2px] items-center justify-start min-h-screen p-1 pb-20  sm:p-10">
      <div className="flex flex-col gap-8 row-start-2 items-start sm:items-start text-center">
        <h1 className="w-full text-3xl text-center font-bold">
          About MatScout
        </h1>
        <p className="text-center w-full text-2xl">
          Welcome to MatScout, your one-stop platform for tracking your
          grapplers performance!
        </p>
        <h2 className="w-full text-xl text-center font-bold">Who We Are</h2>
        <p className="text-center w-full text-2xl">
          MatScout is a dedicated platform designed for grappling athletes,
          coaches, and sports enthusiasts. Our mission is to provide a
          comprehensive solution for tracking, analyzing, and improving a
          grappler&apos;s performance.
        </p>
        <h2 className="w-full text-xl text-center font-bold">What We Do</h2>
        <p className="text-center w-full text-2xl">
          At MatScout, we believe in the power of data. Our platform allows
          athletes to join teams, track their performance, and compare their
          stats with competitors. Coaches can manage their teams, monitor
          athletes&apos; progress, and make data-driven decisions to enhance
          their team&apos;s performance.
        </p>
        <h2 className="w-full text-xl text-center font-bold">Why Choose Us</h2>
        <p className="text-center w-full text-2xl">
          With MatScout, you get more than just a performance tracking tool. You
          become part of the grappling community that is passionate about sports
          and committed to excellence. Our platform is user-friendly, secure,
          and designed to help you reach your full potential.
        </p>
        <h2 className="w-full text-xl text-center font-bold">Join Us</h2>
        <p className="text-center w-full text-2xl">
          Whether you&apos;re an athlete looking to improve, a coach seeking to
          lead your team to victory, or a sports enthusiast wanting to follow
          your favorite athletes, MatScout has something for you. Sign up today
          and start your journey to greatness with us!
        </p>
        <p className="text-center w-full text-2xl">
          Thank you for visiting MatScout. We look forward to being a part of
          your sports journey!
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
