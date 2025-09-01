// app/dashboard/settings/techniques/page.jsx
import TechniquesAdmin from "@/components/admin/techniques/TechniquesAdmin";

export const dynamic = "force-dynamic";

export default function TechniquesAdminPage() {
  return (
    <div className="px-4 md:px-6 lg:px-8">
      <TechniquesAdmin />
    </div>
  );
}
