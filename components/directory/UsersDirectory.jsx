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

const EMERGENCY =
  "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";

function pickAvatar(entity) {
  if (entity.type === "family") {
    const chosen = (entity.avatar || "").trim() || EMERGENCY;
    return cld(chosen, "w_200,h_200,c_fill,g_auto,dpr_auto") || chosen;
  }
  const typeUrl =
    entity?.avatarType === "google"
      ? entity?.googleAvatar
      : entity?.avatarType === "facebook"
      ? entity?.facebookAvatar
      : entity?.avatar;
  const selected = [typeUrl, entity?.avatar, EMERGENCY]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);
  return cld(selected, "w_200,h_200,c_fill,g_auto,dpr_auto") || selected;
}

function UserCard({ entity }) {
  const avatarUrl = pickAvatar(entity);
  const fullName = [entity.firstName, entity.lastName]
    .filter(Boolean)
    .join(" ");
  const location = [entity.city, entity.state].filter(Boolean).join(", ");
  const styles = entity.styles || [];
  const link =
    entity.profileUrl ||
    (entity.type === "user"
      ? `/${entity.username}`
      : `/family/${entity.username}`);

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-gray-900 shadow hover:shadow-lg transition overflow-hidden">
      <div className="p-4 flex gap-3 items-center">
        <Image
          src={avatarUrl}
          alt={fullName || entity.username || "Profile"}
          width={56}
          height={56}
          sizes="56px"
          className="rounded-full border border-border object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={link}
              className="block font-semibold text-blue-600 dark:text-blue-400 truncate"
              title={fullName || entity.username}
            >
              {fullName || `@${entity.username}`}
            </Link>
            {entity.type === "family" && (
              <span className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted-foreground">
                Family
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            @{entity.username}
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

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (firstName) p.set("firstName", firstName);
    if (lastName) p.set("lastName", lastName);
    if (city) p.set("city", city);
    if (state) p.set("state", state);
    if (style) {
      // Keep existing exact param for backward compatibility…
      p.set("style", style);
      // …and add a regex param so the API can do prefix/word-start matches.
      // Example: style="j" -> styleRegex="(?:^|\\s)j"
      const s = escapeRegex(style.trim());
      if (s) p.set("styleRegex", `(?:^|\\s)${s}`);
    }
    if (sort && sort !== "recent") p.set("sort", sort);
    if (page > 1) p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [q, firstName, lastName, city, state, style, sort, page, limit]);

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
          setItems(data.users || []);
          setTotal(data.total || 0);
          setLimit(data.limit || 24);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
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

  const totalPages = Math.max(Math.ceil(total / limit), 1);
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
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No users match your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((entity) => (
            <UserCard
              key={`${entity.type}:${entity._id}`}
              entity={entity}
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
