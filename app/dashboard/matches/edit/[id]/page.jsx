"use client";
import { useParams } from "next/navigation";
import MatchReportForm from "@/components/dashboard/forms/MatchReportForm";

export default function EditMatchReportPage() {
  const { id } = useParams();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Match Report</h1>
      <MatchReportForm reportId={id} />
    </div>
  );
}
