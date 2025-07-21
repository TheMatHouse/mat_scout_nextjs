"use client";
import React, { useEffect } from "react";

const DataDeletion = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  return (
    <section className="min-h-screen px-6 py-12 md:px-10 lg:px-16 max-w-3xl mx-auto bg-background text-foreground">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
        Data Deletion Instructions
      </h1>
      <p className="mb-4">
        If you have an account with MatScout and wish to delete your data, you
        have two options:
      </p>
      <ol className="list-decimal list-inside mb-4 space-y-2">
        <li>
          <strong>Via Email:</strong> You can email us at{" "}
          <a
            href="mailto:privacy@matscout.com"
            className="text-blue-500 underline dark:text-blue-400"
          >
            privacy@matscout.com
          </a>{" "}
          requesting deletion of your account and all associated data.
        </li>
        <li>
          <strong>Via Settings:</strong> If you are logged in, visit your
          Dashboard Settings and use the “Delete Account” option.
        </li>
      </ol>
      <p className="mb-4">
        Once we receive your request, we will verify your identity and
        permanently remove your data from our servers within 7 days.
      </p>
      <p className="text-sm text-muted-foreground">
        Last updated: May 29, 2025
      </p>
    </section>
  );
};

export default DataDeletion;
