// app/admin/analytics/page.jsx
import { connectDB } from "@/lib/mongo";
import AnalyticsEvent from "@/models/analyticsEvent";
import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";

function hoursAgo(n) {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() - n);
  return d;
}

async function getData() {
  await connectDB();

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [hourly, unique24h, pv24h, topPages7d] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: since24h } } },
      {
        $group: {
          _id: { $dateTrunc: { date: "$ts", unit: "hour" } },
          pv: { $sum: 1 },
        },
      },
      { $project: { _id: 0, hour: "$_id", pv: 1 } },
      { $sort: { hour: 1 } },
    ]),
    AnalyticsEvent.distinct("visitor", { ts: { $gte: since24h } }).then(
      (a) => a.length
    ),
    AnalyticsEvent.countDocuments({ ts: { $gte: since24h } }),
    AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: since7d } } },
      { $group: { _id: "$path", pv: { $sum: 1 } } },
      { $project: { _id: 0, path: "$_id", pv: 1 } },
      { $sort: { pv: -1 } },
      { $limit: 25 },
    ]),
  ]);

  return { hourly, unique24h, pv24h, topPages7d };
}

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const data = await getData();
  const norm = normalize24(data.hourly);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI
          label="Pageviews (24h)"
          value={data.pv24h}
        />
        <KPI
          label="Unique visitors (24h)"
          value={data.unique24h}
        />
        <KPI
          label="Top page (7d)"
          value={data.topPages7d[0]?.path || "—"}
        />
      </div>

      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-medium mb-2">Pageviews by hour (24h)</h2>
        <LineSVG data={norm} />
      </section>

      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-medium mb-2">Top pages (7d)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Path</th>
              <th className="py-2 w-24">PVs</th>
            </tr>
          </thead>
          <tbody>
            {data.topPages7d.map((r) => (
              <tr
                key={r.path}
                className="border-t"
              >
                <td className="py-2 font-mono">{r.path}</td>
                <td className="py-2">{r.pv}</td>
              </tr>
            ))}
            {data.topPages7d.length === 0 && (
              <tr>
                <td
                  className="py-6 text-gray-500"
                  colSpan={2}
                >
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function normalize24(hourly) {
  // ensure 24 buckets ending at current hour
  const map = new Map(
    hourly.map((r) => [new Date(r.hour).toISOString(), r.pv])
  );
  const out = [];
  const end = new Date();
  end.setMinutes(0, 0, 0);
  for (let i = 23; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    out.push({ hour: d, pv: map.get(key) || 0 });
  }
  return out;
}

/** zero-dep inline SVG line chart */
function LineSVG({ data }) {
  const W = 800;
  const H = 200;
  const P = 24;
  const max = Math.max(1, ...data.map((d) => d.pv));
  const stepX = (W - P * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = P + i * stepX;
    const y = H - P - (d.pv * (H - P * 2)) / max;
    return `${x},${y}`;
  });

  return (
    <div className="overflow-x-auto">
      <svg
        width={W}
        height={H}
        className="w-full h-52"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points.join(" ")}
        />
        <line
          x1={P}
          y1={H - P}
          x2={W - P}
          y2={H - P}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
      </svg>
    </div>
  );
}
