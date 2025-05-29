"use client";
import React, { useEffect } from "react";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      <section className="px-4 py-8 md:px-8 lg:px-16 max-w-5xl mx-auto text-base text-gray-200">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
          Privacy Policy
        </h1>

        <p className="mb-4">
          This Privacy Policy applies only to information that you provide to us
          through the Site (MatScout.com)...
        </p>

        <p className="mb-4">
          As used in this policy, the terms "using" and "processing" information
          include using cookies...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Information Collection and Use
        </h3>
        <p className="mb-4">
          Our primary goals in collecting information are to provide and improve
          our Site...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Personally Identifiable Information
        </h3>
        <p className="mb-4">
          When you register with us through the Site and become a Member...
        </p>

        <p className="mb-4">
          You can register to join via the Site by completing the required
          forms...
        </p>

        <p className="mb-4">
          We also collect the other information that you provide as part of
          registration...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">Log Data</h3>
        <p className="mb-4">
          When you visit the Site, our servers automatically record information
          that your browser sends...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">Cookies</h3>
        <p className="mb-4">
          Like many websites, we use "cookies" to collect information...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Web Beacons
        </h3>
        <p className="mb-4">
          Our Site may contain electronic images known as Web beacons...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">Phishing</h3>
        <p className="mb-4">
          Identity theft and the practice currently known as "phishing" are of
          great concern to us...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Information Sharing and Disclosure
        </h3>
        <h4 className="text-lg font-medium mt-6 mb-2 underline">Overview</h4>
        <p className="mb-4">
          The Site can be used to facilitate the creation and entering of
          tournaments...
        </p>

        <h4 className="text-lg font-medium mt-6 mb-2 underline">
          Members and Users
        </h4>
        <p className="mb-4">
          When you create a MatScout Account, we will set up a profile page for
          you...
        </p>

        <h4 className="text-lg font-medium mt-6 mb-2 underline">Tournaments</h4>
        <p className="mb-4">
          If you create a Tournament, we may publish it publicly via the Site...
        </p>

        <h4 className="text-lg font-medium mt-6 mb-2 underline">
          Aggregate and Non-Identifying Information
        </h4>
        <p className="mb-4">
          We may share aggregated information that does not include Personal
          Information...
        </p>

        <h4 className="text-lg font-medium mt-6 mb-2 underline">
          Service Providers
        </h4>
        <p className="mb-4">
          We may employ third party companies and individuals to facilitate our
          Service...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Compliance with Laws and Law Enforcement
        </h3>
        <p className="mb-4">
          We cooperate with government and law enforcement officials...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Business Transfers
        </h3>
        <p className="mb-4">
          Adaplex may sell, transfer or otherwise share some or all of its
          assets...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Changing or Deleting Your Information
        </h3>
        <p className="mb-4">
          All Members may review, update, correct or delete the Personal
          Information...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">Security</h3>
        <p className="mb-4">
          MatScout.com is very concerned with safeguarding your information...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Links to Other Websites
        </h3>
        <p className="mb-4">
          Our Site contains links to other websites. If you choose to visit a
          third party...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Testimonials
        </h3>
        <p className="mb-4">
          With your consent we may post your testimonial on the Site along with
          your name...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Our Policy Toward Children
        </h3>
        <p className="mb-4">
          The Site is not directed to individuals under 13...
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-2 underline">
          Contacting Us
        </h3>
        <p className="mb-4">
          If you have any questions about this Privacy Policy, please contact us
          via email at{" "}
          <a
            href="mailto:policies@MatScout.com"
            className="text-blue-400 underline"
          >
            policies@MatScout.com
          </a>
          .
        </p>
      </section>
    </>
  );
};

export default PrivacyPolicy;
