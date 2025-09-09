"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function FamilyMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [member, setMember] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`/api/admin/family-members/${id}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setMember(json.member);
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onDelete() {
    const yes = confirm("Delete this family member? This cannot be undone.");
    if (!yes) return;
    try {
      const res = await fetch(`/api/admin/family-members/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      router.push("/admin/family-members");
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Family Member</h1>
        <div className="flex gap-2">
          <Link
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm"
            href="/admin/family-members"
          >
            Back
          </Link>
          <button
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-sm"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        {loading && <div className="text-neutral-500">Loading…</div>}
        {err && (
          <div className="text-rose-600 dark:text-rose-400">Error: {err}</div>
        )}
        {member && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Name"
              value={
                [member.firstName, member.lastName].filter(Boolean).join(" ") ||
                "—"
              }
            />
            <Field
              label="Email"
              value={member.email || "—"}
            />
            <Field
              label="Phone"
              value={member.phone || "—"}
            />
            <Field
              label="Relation"
              value={member.relation || "—"}
            />
            <Field
              label="Linked User ID"
              value={member.userId || "—"}
            />
            <Field
              label="Status"
              value={member.status || "—"}
            />
            <Field
              label="Birthdate"
              value={
                member.birthdate
                  ? new Date(member.birthdate).toLocaleDateString()
                  : "—"
              }
            />
            <Field
              label="Address"
              value={member.address || "—"}
            />
            <Field
              label="Created"
              value={
                member.createdAt
                  ? new Date(member.createdAt).toLocaleString()
                  : "—"
              }
            />
            <Field
              label="Updated"
              value={
                member.updatedAt
                  ? new Date(member.updatedAt).toLocaleString()
                  : "—"
              }
            />
            {member.notes && (
              <div className="md:col-span-2">
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                  Notes
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 whitespace-pre-wrap">
                  {member.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
        {label}
      </div>
      <div className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        {value}
      </div>
    </div>
  );
}
