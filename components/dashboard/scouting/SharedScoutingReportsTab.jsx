"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Spinner from "@/components/shared/Spinner";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import DashboardScoutingReportCard from "@/components/shared/DashboardScoutingReportCard";

function SharedScoutingReportsTab({ user }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    fetchShared();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  async function fetchShared() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/${user._id}/scoutingReports/shared`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load shared scouting reports:", e);
      toast.error("Failed to load shared scouting reports");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner size={64} />;

  if (!groups.length) {
    return (
      <p className="text-gray-900 dark:text-gray-100 mt-6">
        No one has shared scouting reports with you.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-10">
        {groups.map((g) =>
          g.reports?.length ? (
            <div key={g.owner?._id}>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                {g.owner?.name || g.owner?.username}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.reports.map((r) => (
                  <DashboardScoutingReportCard
                    key={r._id}
                    report={r}
                    onView={() => {
                      setSelectedReport(r);
                      setPreviewOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>

      {previewOpen && selectedReport && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedReport}
          reportType="scouting"
        />
      )}
    </>
  );
}

export default SharedScoutingReportsTab;
