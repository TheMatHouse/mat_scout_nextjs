"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ModalLayout from "@/components/shared/ModalLayout";

const ClientQuickView = ({ reportId, closeHref }) => {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    report: null,
    error: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/reports/matches/${reportId}`, {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const ct = (res.headers.get("content-type") || "").toLowerCase();

        if (!ct.includes("application/json")) {
          await res.text();
          throw new Error(
            `Unexpected response (status ${res.status}). Check admin route & middleware.`
          );
        }

        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
        setState({ loading: false, report: json.report, error: "" });
      } catch (e) {
        if (!alive) return;
        setState({
          loading: false,
          report: null,
          error: e?.message || "Failed to load report",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [reportId]);

  const onClose = () => router.push(closeHref, { scroll: false });

  const { loading, report, error } = state;

  return (
    <ModalLayout
      isOpen
      onClose={onClose}
      title="Match Report"
      description=""
      withCard
    >
      {loading ? (
        <div className="py-10 text-center text-gray-900 dark:text-gray-100">
          Loading…
        </div>
      ) : error ? (
        <div className="py-10 text-center text-red-600">{error}</div>
      ) : report ? (
        <div className="space-y-6">
          {/* Header row: event + chips */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
                Event
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {report.eventName || "—"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {report.allowPublic ? "Public" : "Private"}
              </span>
              {report.result ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 capitalize">
                  {report.result}
                </span>
              ) : null}
              {report.teamSlug ? (
                <Link
                  href={`/teams/${report.teamSlug}`}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:underline"
                >
                  Team: {report.teamSlug}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Details grid like your other forms */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Date">
              {report.createdAt
                ? new Date(report.createdAt).toLocaleString()
                : "—"}
            </Field>
            <Field label="Opponent">{report.opponentName || "—"}</Field>

            <Field label="Division">
              {/* Avoid raw ObjectId look */}
              {/^[0-9a-f]{24}$/i.test(String(report.division || ""))
                ? "—"
                : report.division || "—"}
            </Field>
            <Field label="Weight">{report.weightClass || "—"}</Field>

            <Field
              label="Notes"
              full
            >
              {report.notes ? (
                <div className="whitespace-pre-wrap">{report.notes}</div>
              ) : (
                "—"
              )}
            </Field>
          </dl>

          {(report.video?.url || report.url) && (
            <div className="pt-2">
              <a
                href={report.video?.url || report.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
              >
                Open video
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center text-gray-900 dark:text-gray-100">
          No data
        </div>
      )}
    </ModalLayout>
  );
};

const Field = ({ label, children, valueClass = "", full = false }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <dt className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
      {label}
    </dt>
    <dd
      className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${valueClass}`}
    >
      {children}
    </dd>
  </div>
);

export default ClientQuickView;
