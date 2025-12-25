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

/** Format a date as "Invited X minutes ago" */
function formatTimeAgo(date) {
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 30) return "Invited just now";
  if (diffSeconds < 60) return "Invited less than a minute ago";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60)
    return `Invited ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `Invited ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Invited ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatCooldownLeft(msLeft) {
  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatRetryAfter(ms) {
  if (ms <= 0) return "Resend available";

  const minutes = Math.ceil(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    return days === 1 ? "tomorrow" : `in ${days} days`;
  }

  if (hours >= 1) {
    return `in ~${hours} hour${hours > 1 ? "s" : ""}`;
  }

  return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
}

const InvitesTable = ({
  slug,
  invites,
  loading,
  onResend,
  onRevoke,
  resendCooldownUntil = {},
  resendTooltipByInvite = {},
}) => {
  const now = Date.now();

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
            const targetEmail = inv.email || "";

            const nameFromFields = [inv.firstName, inv.lastName]
              .filter(Boolean)
              .join(" ");
            const labelName = inv.isMinor
              ? nameFromFields || "(minor)"
              : nameFromFields || "Invited user";

            const role = inv?.payload?.role || inv?.role || "member";

            const rawMessage = inv?.message ?? inv?.payload?.message ?? "";
            const preview = rawMessage
              ? htmlToText(rawMessage).replace(/\s+/g, " ")
              : "";

            const expiresAt = inv?.expiresAt ? new Date(inv.expiresAt) : null;

            const invitedAt = inv?.createdAt
              ? new Date(inv.createdAt)
              : inv?.updatedAt
              ? new Date(inv.updatedAt)
              : null;

            const invitedAgo = invitedAt ? formatTimeAgo(invitedAt) : null;

            const cooldownUntil = resendCooldownUntil?.[inv._id] || 0;
            const onCooldown = cooldownUntil > now;
            const msLeft = cooldownUntil - now;

            const rateLimitTip = resendTooltipByInvite?.[inv._id] || "";
            const cooldownTip = onCooldown
              ? `Resend available in ${formatCooldownLeft(msLeft)}`
              : "";

            const resendTitle = rateLimitTip || cooldownTip || "Resend invite";

            return (
              <div
                key={inv._id}
                className="py-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start sm:items-center">
                  {/* LEFT: invite info */}
                  <div className="sm:col-span-7 min-w-0">
                    <div className="text-sm min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-2">
                        <span>{labelName}</span>

                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          {role}
                        </span>

                        {inv.isMinor && (
                          <span className="text-xs text-gray-500">(minor)</span>
                        )}

                        {invitedAgo && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {invitedAgo}
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

                  {/* RIGHT: actions */}
                  <div className="sm:col-span-5 min-w-0">
                    <div className="flex gap-2 sm:justify-end flex-nowrap">
                      <button
                        onClick={() => {
                          if (!onCooldown) onResend(inv._id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap shrink-0 disabled:opacity-60 disabled:hover:bg-transparent"
                        title={`Resend available ${formatRetryAfter(
                          retryAfterMs
                        )}`}
                        type="button"
                        disabled={onCooldown}
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
};

export default InvitesTable;
