"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function InviteClaimPage({ params }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | redirecting | accepting | error
  const [message, setMessage] = useState("Preparing invite…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const { token } = params || {};
        if (!token) {
          setStatus("error");
          setMessage("Missing invite token.");
          return;
        }

        // If not logged in, your auth middleware/guards might redirect automatically,
        // but we handle it explicitly by trying the accept endpoint and catching 401.
        setStatus("accepting");
        setMessage("Claiming your invite…");

        const res = await fetch("/api/shares/invites/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });

        // If unauthorized, send to login and preserve the invite route.
        if (res.status === 401) {
          try {
            localStorage.setItem("ms_post_auth_redirect", `/invite/${token}`);
          } catch (_) {
            // ignore
          }

          setStatus("redirecting");
          setMessage("Please log in to claim this invite…");

          // Use your actual login route if different
          router.replace(
            `/login?next=${encodeURIComponent(`/invite/${token}`)}`
          );
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.message || "This invite is invalid or expired.");
          return;
        }

        const redirectTo = data?.redirect || "/dashboard/matches?view=shared";

        if (cancelled) return;

        setStatus("redirecting");
        setMessage("Invite claimed! Redirecting…");
        router.replace(redirectTo);
      } catch (err) {
        setStatus("error");
        setMessage(String(err?.message || err || "Failed to claim invite."));
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Claim Invite
        </h1>

        <p className="mt-2 text-gray-900 dark:text-gray-100">{message}</p>

        {status === "error" ? (
          <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4">
            <p className="text-gray-900 dark:text-gray-100">
              If you believe this is a mistake, ask the sender to resend the
              invite.
            </p>

            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-3 inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
            >
              Go to Home
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default InviteClaimPage;
