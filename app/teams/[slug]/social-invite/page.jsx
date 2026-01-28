"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";

import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";

const SocialInvitePage = () => {
  const { user, loading: userLoading } = useUser();

  const params = useParams();
  const slug = params?.slug;

  const [team, setTeam] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState("loading");
  // loading | not-logged-in | can-join | pending | member | error
  const [submitting, setSubmitting] = useState(false);

  const loadInviteContext = useCallback(async () => {
    try {
      setMembershipStatus("loading");

      const res = await fetch(`/api/teams/${encodeURIComponent(slug)}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        setMembershipStatus("error");
        return;
      }

      const data = await res.json();
      setTeam(data.team);

      if (!user) {
        setMembershipStatus("not-logged-in");
        return;
      }

      if (data.membership?.role === "pending") {
        setMembershipStatus("pending");
      } else if (data.membership?.role) {
        setMembershipStatus("member");
      } else {
        setMembershipStatus("can-join");
      }
    } catch (err) {
      console.error("Failed to load social invite:", err);
      setMembershipStatus("error");
    }
  }, [slug, user]);

  useEffect(() => {
    if (!slug || userLoading) return;
    loadInviteContext();
  }, [slug, userLoading, loadInviteContext]);

  const handleRequestJoin = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${slug}/join`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          joinedVia: "social-invite",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to request to join team.");
        return;
      }

      toast.success("Request sent! A coach will review it shortly.");
      setMembershipStatus("pending");
    } catch (err) {
      console.error("Join request failed:", err);
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (membershipStatus === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (membershipStatus === "error" || !team) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-xl font-semibold">Team not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
      <h1 className="text-2xl font-bold">{team.teamName || team.name}</h1>

      <p className="text-gray-900 dark:text-gray-100">
        You’ve been invited to request access to this team on MatScout.
      </p>

      <p className="text-sm text-gray-900 dark:text-gray-100">
        A coach must approve your request before you can view team content.
      </p>

      {membershipStatus === "not-logged-in" && (
        <Link href={`/login?redirect=/teams/${slug}/social-invite`}>
          <Button className="btn btn-primary">
            Log in or create an account to continue
          </Button>
        </Link>
      )}

      {membershipStatus === "can-join" && (
        <Button
          onClick={handleRequestJoin}
          disabled={submitting}
          className="btn-submit"
        >
          {submitting ? "Requesting..." : "Request to Join Team"}
        </Button>
      )}

      {membershipStatus === "pending" && (
        <p className="font-medium text-gray-900 dark:text-gray-100">
          Your request is pending approval.
        </p>
      )}

      {membershipStatus === "member" && (
        <div className="space-y-4">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            You are already a member of {team.teamName || team.name}.
          </p>

          <Link href={`/teams/${slug}`}>
            <Button>Go to Team Page</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default SocialInvitePage;
