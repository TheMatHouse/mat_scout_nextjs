"use client";

export default function TeamUpdatesList({ updates, loading }) {
  if (loading) {
    return <div className="text-slate-400">Loading updates…</div>;
  }
  if (!updates?.length) {
    return <div className="text-slate-400">No updates yet.</div>;
  }

  return (
    <ul className="divide-y divide-slate-800">
      {updates.map((u) => (
        <li
          key={u._id}
          className="py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{u.title}</h3>
                {u.pinned && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
                    Pinned
                  </span>
                )}
              </div>
              {u.body && (
                <p className="text-slate-300 mt-1 whitespace-pre-wrap">
                  {u.body}
                </p>
              )}
            </div>
            <div className="text-xs text-slate-400">
              {new Date(u.createdAt).toLocaleString()}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
