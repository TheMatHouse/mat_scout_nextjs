export const dynamic = "force-dynamic";

import Link from "next/link";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import ContactThread from "@/models/contactThreadModel";

function fmt(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default async function MessagesListPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return null;

  await connectDB();

  // ✅ await searchParams (App Router)
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(sp?.limit || "20", 10)));
  const status = (sp?.status || "open").toLowerCase(); // "open" | "closed" | "all"
  const q = (sp?.q || "").trim();

  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ subject: rx }, { fromName: rx }, { fromEmail: rx }];
  }

  const [total, rows] = await Promise.all([
    ContactThread.countDocuments(filter),
    ContactThread.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "_id subject fromName fromEmail status lastMessageAt lastDirection createdAt updatedAt"
      )
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Messages</h1>
        <div className="text-sm text-gray-500">
          {total} thread{total === 1 ? "" : "s"}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex gap-2"
          action="/admin/messages"
          method="get"
        >
          <input
            className="px-3 py-2 rounded border bg-transparent"
            name="q"
            placeholder="Search subject, name, email"
            defaultValue={q}
          />
          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 rounded border bg-transparent"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <input
            type="hidden"
            name="limit"
            value={String(limit)}
          />
          <button className="px-3 py-2 rounded border">Filter</button>
        </form>

        {(q || status !== "open") && (
          <Link
            href="/admin/messages"
            className="text-[var(--ms-light-red)] hover:underline"
          >
            Clear
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900/30">
            <tr className="text-left">
              <th className="p-3">Subject</th>
              <th className="p-3">From</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last Message</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="p-4 text-center text-gray-500"
                  colSpan={5}
                >
                  No messages found.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const isNew = t.lastDirection === "inbound";
                return (
                  <tr
                    key={t._id}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isNew && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-[var(--ms-light-red)]"
                            title="New inbound"
                          />
                        )}
                        <span className={isNew ? "font-semibold" : ""}>
                          {t.subject}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {t.fromName}{" "}
                      <span className="text-gray-500">
                        &lt;{t.fromEmail}&gt;
                      </span>
                    </td>
                    <td className="p-3 capitalize">{t.status}</td>
                    <td className="p-3 whitespace-nowrap">
                      {fmt(t.lastMessageAt)}
                    </td>
                    <td className="p-3">
                      <Link
                        className="text-[var(--ms-light-red)] hover:underline"
                        href={`/admin/messages/${t._id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Link
            className={[
              "px-3 py-1 rounded border",
              page <= 1 ? "opacity-50 pointer-events-none" : "",
            ].join(" ")}
            href={`/admin/messages?status=${status}&q=${encodeURIComponent(
              q
            )}&page=${page - 1}&limit=${limit}`}
          >
            Prev
          </Link>
          <Link
            className={[
              "px-3 py-1 rounded border",
              page >= totalPages ? "opacity-50 pointer-events-none" : "",
            ].join(" ")}
            href={`/admin/messages?status=${status}&q=${encodeURIComponent(
              q
            )}&page=${page + 1}&limit=${limit}`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
