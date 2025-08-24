export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/auth-server";
import BackupClient from "@/components/admin/backups/BackupClient";

export default async function AdminBackupsPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return null;

  const serverSaveEnabled = Boolean(process.env.BACKUP_DIR);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Backups</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Create on-demand JSON backups of your MatScout data. Download locally or
        save to a server folder.
      </p>

      <BackupClient serverSaveEnabled={serverSaveEnabled} />
    </div>
  );
}
