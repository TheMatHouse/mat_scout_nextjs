"use client";
import Spinner from "@/components/shared/Spinner";
import { RefreshCw, XCircle, Shield } from "lucide-react";

/** Convert any HTML to plain text (decodes entities, removes tags). */
function htmlToText(html = "") {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

export default function InvitesTable({
  slug,
  invites,
  loading,
  onResend,
  onRevoke,
}) {
  return (
    <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Pending Invitations
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-gray-500">
          <Spinner size={24} />
          <span>Loading invites…</span>
        </div>
      ) : invites.length ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {invites.map((inv) => {
            // email is always stored in `email` for both adults and minors in your current model
            const targetEmail = inv.email || "";

            // name/label: minors have first/last; adults may not
            const nameFromFields = [inv.firstName, inv.lastName]
              .filter(Boolean)
              .join(" ");
            const labelName = inv.isMinor
              ? nameFromFields || "(minor)"
              : nameFromFields || "Invited user";

            // role may be stored on payload or top-level depending on version
            const role = inv?.payload?.role || inv?.role || "member";

            // message may be on payload or top-level depending on version
            const rawMessage = inv?.message ?? inv?.payload?.message ?? "";
            const preview = rawMessage
              ? htmlToText(rawMessage).replace(/\s+/g, " ")
              : "";

            // guard expiresAt to avoid "Invalid Date"
            const expiresAt = inv?.expiresAt ? new Date(inv.expiresAt) : null;

            return (
              <div
                key={inv._id}
                className="py-3"
              >
                {/* Responsive row: info left (7 cols), actions right (5 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start sm:items-center">
                  {/* LEFT: invite info */}
                  <div className="sm:col-span-7 min-w-0">
                    <div className="text-sm min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {labelName}
                        <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          {role}
                        </span>
                        {inv.isMinor && (
                          <span className="ml-2 text-xs text-gray-500">
                            (minor)
                          </span>
                        )}
                      </div>

                      <div className="text-gray-600 dark:text-gray-300 truncate">
                        {targetEmail}
                      </div>

                      {expiresAt && (
                        <div className="text-xs text-gray-500">
                          Expires {expiresAt.toLocaleDateString()}
                        </div>
                      )}

                      {preview && (
                        <div className="text-xs text-gray-500 mt-1 italic line-clamp-2">
                          “{preview}”
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: actions (same styles; never force row width) */}
                  <div className="sm:col-span-5 min-w-0">
                    <div className="flex gap-2 sm:justify-end flex-nowrap">
                      <button
                        onClick={() => onResend(inv._id)}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap shrink-0"
                        title="Resend invite"
                        type="button"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Resend
                      </button>
                      <button
                        onClick={() => onRevoke(inv._id)}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 border-red-200 dark:border-red-800 whitespace-nowrap shrink-0"
                        title="Revoke invite"
                        type="button"
                      >
                        <XCircle className="w-4 h-4" />
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No pending invitations.
        </p>
      )}
    </section>
  );
}
