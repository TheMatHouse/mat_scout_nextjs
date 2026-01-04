// app/(teams)/teams/[slug]/social-invite/page.jsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";

const SocialInvitePage = ({ params }) => {
  const { user, loading: userLoading } = useUser();
  const slug = params?.slug;

  const [team, setTeam] = useState(null);
  const [status, setStatus] = useState("loading");
  // loading | not-logged-in | can-join | pending | member | error
  const [submitting, setSubmitting] = useState(false);

  const loadContext = useCallback(async () => {
    try {
      setStatus("loading");

      const res = await fetch(`/api/teams/${slug}/public`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = await res.json();
      setTeam(data.team);

      if (!user) {
        setStatus("not-logged-in");
      } else if (data.membership?.role === "pending") {
        setStatus("pending");
      } else if (data.membership?.role) {
        setStatus("member");
      } else {
        setStatus("can-join");
      }
    } catch (err) {
      console.error("Failed to load social invite:", err);
      setStatus("error");
    }
  }, [slug, user]);

  useEffect(() => {
    if (!slug || userLoading) return;
    loadContext();
  }, [slug, userLoading, loadContext]);

  const handleJoin = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${slug}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinedVia: "social-invite" }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Unable to submit join request.");
        setSubmitting(false);
        return;
      }

      toast.success("Request sent! A coach will review it shortly.");
      setStatus("pending");
    } catch (err) {
      console.error("Join request failed:", err);
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (status === "error" || !team) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Team not found
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-24 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {team.teamName || team.name}
        </h1>

        <p className="text-gray-900 dark:text-gray-100">
          You’ve been invited to request access to this team on MatScout.
        </p>

        <p className="text-sm text-gray-900 dark:text-gray-100">
          A coach must approve your request before you can view team content.
        </p>

        {status === "not-logged-in" && (
          <Link href={`/login?redirect=/teams/${slug}/social-invite`}>
            <Button className="w-full">Log in or create an account</Button>
          </Link>
        )}

        {status === "can-join" && (
          <Button
            onClick={handleJoin}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Requesting..." : "Request to Join Team"}
          </Button>
        )}

        {status === "pending" && (
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Your request is pending approval.
          </p>
        )}

        {status === "member" && (
          <p className="font-medium text-gray-900 dark:text-gray-100">
            You are already a member of this team.
          </p>
        )}
      </div>
    </div>
  );
};

export default SocialInvitePage;
