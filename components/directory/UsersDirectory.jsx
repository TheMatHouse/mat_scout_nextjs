// components/directory/UsersDirectory.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url;
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

function pickAvatar(u) {
  const EMERGENCY =
    "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
  const typeUrl =
    u?.avatarType === "google"
      ? u?.googleAvatar
      : u?.avatarType === "facebook"
      ? u?.facebookAvatar
      : u?.avatar;
  const selected = [typeUrl, u?.avatar, EMERGENCY]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);
  return cld(selected, "w_200,h_200,c_fill,g_auto,dpr_auto") || selected;
}

function UserCard({ user }) {
  const avatarUrl = pickAvatar(user);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const location = [user.city, user.state].filter(Boolean).join(", ");
  const styles = user.styles || [];

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-gray-900 shadow hover:shadow-lg transition overflow-hidden">
      <div className="p-4 flex gap-3 items-center">
        <Image
          src={avatarUrl}
          alt={fullName || user.username}
          width={56}
          height={56}
          sizes="56px"
          className="rounded-full border border-border object-cover"
        />
        <div className="min-w-0">
          <Link
            href={`/${user.username}`}
            className="block font-semibold text-blue-600 dark:text-blue-400 truncate"
            title={fullName || user.username}
          >
            {fullName || `@${user.username}`}
          </Link>
          <div className="text-xs text-muted-foreground truncate">
            @{user.username}
          </div>
          {location && (
            <div className="text-xs text-muted-foreground truncate">
              {location}
            </div>
          )}
        </div>
      </div>
      {styles.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {styles.slice(0, 6).map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground"
              >
                {s}
              </span>
            ))}
            {styles.length > 6 && (
              <span className="text-xs text-muted-foreground">
                +{styles.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersDirectory() {
  const [q, setQ] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [style, setStyle] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);

  // build query string
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (firstName) p.set("firstName", firstName);
    if (lastName) p.set("lastName", lastName);
    if (city) p.set("city", city);
    if (state) p.set("state", state);
    if (style) p.set("style", style);
    if (sort && sort !== "recent") p.set("sort", sort);
    if (page > 1) p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [q, firstName, lastName, city, state, style, sort, page, limit]);

  // fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/users/search?${qs}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users || []);
          setTotal(data.total || 0);
          setLimit(data.limit || 24);
        }
      } catch (e) {
        if (!cancelled) {
          setUsers([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  // basic pagination calc
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  // debounced handlers (simple)
  const onChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Find People</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="Search name or username…"
          value={q}
          onChange={onChange(setQ)}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="First name"
          value={firstName}
          onChange={onChange(setFirstName)}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="Last name"
          value={lastName}
          onChange={onChange(setLastName)}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="City"
          value={city}
          onChange={onChange(setCity)}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="State"
          value={state}
          onChange={onChange(setState)}
        />
        <input
          className="border rounded-md px-3 py-2 bg-background"
          placeholder="Style (e.g., Judo, BJJ)"
          value={style}
          onChange={onChange(setStyle)}
        />
      </div>

      {/* Sort + results count */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Sort:</label>
          <select
            className="border rounded-md px-2 py-1 bg-background"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="recent">Most recent</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-xl border border-border bg-gray-50 dark:bg-gray-900 animate-pulse"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No users match your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map((u) => (
            <UserCard
              key={u._id}
              user={u}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            className="px-3 py-1.5 border rounded-md disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <div className="text-sm">
            Page {page} / {totalPages}
          </div>
          <button
            className="px-3 py-1.5 border rounded-md disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
