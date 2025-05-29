"use client";
import React, { useEffect } from "react";

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      <section className="px-4 py-8 md:px-8 lg:px-16 max-w-5xl mx-auto text-base text-gray-200">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
          Terms of Service
        </h1>

        <p className="mb-4">
          PLEASE READ THESE TERMS OF SERVICE CAREFULLY AS THEY CONTAIN IMPORTANT
          INFORMATION...
        </p>

        <p className="mb-4">Last Updated: May 7, 2024</p>

        <p className="mb-4 underline font-semibold">TERMS OF SERVICE</p>

        <p className="mb-4">
          If you are using the Site or Services you are contracting with Ron &
          Scott, LLC...
        </p>

        <p className="mb-4">
          RS, LLC provides an online platform called MatScout.com...
        </p>

        <p className="mb-4">
          THE SITE AND SERVICES COMPRISE AN ONLINE PLATFORM THROUGH WHICH
          TOURNAMENT HOSTS...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Key Terms</h2>
        <p className="mb-2">
          <strong>“MatScout Content”</strong> means all Content that RS, LLC
          makes available...
        </p>
        <p className="mb-2">
          <strong>“Collective Content”</strong> means Member Content and
          MatScout Content.
        </p>
        <p className="mb-2">
          <strong>“Content”</strong> means text, graphics, images, music,
          software...
        </p>
        <p className="mb-2">
          <strong>“Tournament Player”</strong> means a Member who enters a
          tournament...
        </p>
        <p className="mb-2">
          <strong>“Tournament Host”</strong> means a Member who creates a
          Tournament...
        </p>
        <p className="mb-2">
          <strong>“Tournament”</strong> means a competitive event created by a
          Tournament Host...
        </p>
        <p className="mb-2">
          <strong>“Member”</strong> means a person who completes MatScout’s
          account registration...
        </p>
        <p className="mb-4">
          <strong>“Member Content”</strong> means all Content that a Member
          posts...
        </p>

        <p className="mb-4">
          Certain areas of the Site and Services may have different terms...
        </p>

        <p className="mb-4">
          YOU ACKNOWLEDGE AND AGREE THAT, BY ACCESSING OR USING THE SITE...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Modification</h2>
        <p className="mb-4">
          RS, LLC reserves the right, at its sole discretion, to modify the Site
          or Terms...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Eligibility</h2>
        <p className="mb-4">
          The Site and Services are intended solely for persons who are 13 or
          older...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">
          How the Site and Services Work
        </h2>
        <p className="mb-4">
          The Site and Services can be used to facilitate the creation and entry
          into Tournaments...
        </p>

        {/* You can continue the rest of the sections the same way: */}
        <h2 className="text-xl font-semibold mt-8 mb-2">
          Account Registration
        </h2>
        <p className="mb-4">
          In order to access certain features of the Site, and to enter a
          Tournament...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Tournaments</h2>
        <p className="mb-4">As a Member, you may create Tournaments...</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">No Endorsement</h2>
        <p className="mb-4">
          MatScout does not endorse any Member or any Tournament...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Ownership</h2>
        <p className="mb-4">
          The Site, Services, and Collective Content are protected by copyright,
          trademark, and other laws...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">
          MatScout Content and Member Content License
        </h2>
        <p className="mb-4">
          Subject to your compliance with the terms, RS, LLC grants you a
          limited, non-exclusive license...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Links</h2>
        <p className="mb-4">
          The Site and Services may contain links to third-party websites or
          resources...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">
          Proprietary Rights Notices
        </h2>
        <p className="mb-4">
          All trademarks and service marks of RS, LLC are protected under law...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Feedback</h2>
        <p className="mb-4">
          We welcome and encourage feedback. You can email us at{" "}
          <a
            href="mailto:terms@MatScout.com"
            className="text-blue-400 underline"
          >
            terms@MatScout.com
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Copyright Policy</h2>
        <p className="mb-4">
          RS, LLC respects copyright law and expects users to do the same...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">
          Suspension, Termination and Account Cancellation
        </h2>
        <p className="mb-4">
          We may suspend or cancel your account with or without notice...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Disclaimers</h2>
        <p className="mb-4">
          You use the Site and Services at your own risk...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Entire Agreement</h2>
        <p className="mb-4">
          These Terms constitute the entire agreement between you and RS, LLC...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">General</h2>
        <p className="mb-4">
          If any provision of these Terms is found to be unenforceable...
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Contacting Us</h2>
        <p className="mb-4">
          If you have any questions, contact us at{" "}
          <a
            href="mailto:terms@MatScout.com"
            className="text-blue-400 underline"
          >
            terms@MatScout.com
          </a>
          .
        </p>
      </section>
    </>
  );
};

export default TermsOfService;
