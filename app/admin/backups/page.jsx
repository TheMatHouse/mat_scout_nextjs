export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import BackupClient from "@/components/admin/backups/BackupClient";
import RestoreClient from "@/components/admin/backups/RestoreClient";
import ServerBackupsList from "@/components/admin/backups/ServerBackupsList";

export default async function AdminBackupsPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const serverSaveEnabled = !!process.env.BACKUP_DIR;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Backups</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Download backups, save to the server, prune old archives, restore
        (staging), and manage existing server backups.
      </p>

      {/* Create backups (download/save/prune) */}
      <BackupClient serverSaveEnabled={serverSaveEnabled} />

      {/* Restore (staging only) */}
      <RestoreClient />

      {/* List server backups */}
      <ServerBackupsList />
    </div>
  );
}
