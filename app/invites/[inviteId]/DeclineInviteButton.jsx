"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

function DeclineInviteButton({ inviteId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const declineInvite = async () => {
    if (!confirm("Are you sure you want to decline this invitation?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/invites/${inviteId}/decline`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to decline invitation");
      }

      toast.success("Invitation declined");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={declineInvite}
      disabled={loading}
      className="btn btn-secondary"
    >
      {loading ? "Declining…" : "Decline Invitation"}
    </button>
  );
}

export default DeclineInviteButton;
