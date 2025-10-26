// components/teams/InvitesTable.jsx
"use client";

export default function InvitesTable({
  slug,
  invites = [],
  loading = false,
  onResend,
  onRevoke,
}) {
  if (loading) {
    return (
      <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Pending Invitations
        </h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Pending Invitations
      </h2>

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invitations.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {invites.map((inv) => {
            const email = inv?.email || inv?.to || "";
            const role = (
              inv?.role ||
              inv?.invitedRole ||
              "member"
            ).toLowerCase();
            const expiresLabel = inv?.expiresAt
              ? new Date(inv.expiresAt).toLocaleDateString()
              : null;

            return (
              <li
                key={inv._id || inv.id || email}
                className="
                  py-4
                  flex flex-col gap-3
                  sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4
                "
              >
                {/* left: email + meta */}
                <div className="min-w-0">
                  <p className="font-medium break-words">{email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                      {role}
                    </span>
                    {expiresLabel && (
                      <span className="opacity-80">Expires {expiresLabel}</span>
                    )}
                  </div>
                </div>

                {/* middle: Resend */}
                <div className="sm:justify-self-end">
                  <button
                    type="button"
                    onClick={() => onResend?.(inv._id || inv.id)}
                    className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted"
                  >
                    Resend
                  </button>
                </div>

                {/* right: Revoke */}
                <div className="sm:justify-self-end">
                  <button
                    type="button"
                    onClick={() => onRevoke?.(inv._id || inv.id)}
                    className="px-3 py-1.5 rounded-md text-sm border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
