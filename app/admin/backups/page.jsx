export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import BackupClient from "@/components/admin/backups/BackupClient";
import RestoreClient from "@/components/admin/backups/RestoreClient";

export default async function AdminBackupsPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const serverSaveEnabled = !!process.env.BACKUP_DIR;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-2">Backups</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Download backups, save to the server, prune old archives, and (on
        staging) restore from a backup.
      </p>

      {/* Existing backup controls */}
      <BackupClient serverSaveEnabled={serverSaveEnabled} />

      {/* NEW: Restore controls */}
      <RestoreClient />
    </div>
  );
}
