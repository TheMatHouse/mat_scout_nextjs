"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const AcceptInviteButton = ({ inviteId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const acceptInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invites/${inviteId}/accept`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to accept invitation");
      }

      toast.success("Invitation accepted");
      router.push(`/teams/${data.teamSlug}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={acceptInvite}
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? "Accepting..." : "Accept Invitation"}
    </button>
  );
};

export default AcceptInviteButton;
