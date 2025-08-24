export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import ContactThread from "@/models/contactThreadModel";
import ThreadView from "@/components/admin/messages/ThreadView";

export default async function MessageThreadPage({ params }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return null;

  await connectDB();

  // ✅ must await params in App Router to avoid the sync dynamic APIs error
  const p = await params;
  const id = p?.id;

  if (!id) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Missing thread id</h1>
      </div>
    );
  }

  let thread = null;
  try {
    thread = await ContactThread.findById(id).lean();
  } catch {
    // handles invalid ObjectId format
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Invalid thread id</h1>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Thread not found</h1>
        <p className="text-gray-500">The message may have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Message: {thread.subject}</h1>
      <ThreadView thread={JSON.parse(JSON.stringify(thread))} />
    </div>
  );
}
