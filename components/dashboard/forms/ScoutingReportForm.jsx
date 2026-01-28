// components/dashboard/forms/ScoutingReportForm.jsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import { scoutingReportCreated } from "@/lib/analytics/adminEvents";

import { Button } from "@/components/ui/button";
import Editor from "../../shared/Editor";
import TechniqueTagInput from "../../shared/TechniqueTagInput";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import CountrySelect from "@/components/shared/CountrySelect";
import { Plus } from "lucide-react";

/* ----------------- helpers ----------------- */
function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.styles)) return payload.styles;
  if (payload && Array.isArray(payload.userStyles)) return payload.userStyles;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

// normalize division select value -> string id
function toDivisionId(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object")
    return String(val.value ?? val._id ?? val.id ?? "");
  return String(val ?? "");
}

function pickStyleName(s) {
  if (!s) return "";
  if (typeof s === "string") return s.trim();
  const candidates = [
    s.styleName,
    s.name,
    s.title,
    s.label,
    typeof s.style === "string" ? s.style : s.style?.name || s.style?.title,
    typeof s.matchType === "string" ? s.matchType : undefined,
  ].filter(Boolean);
  const v = candidates[0] ?? "";
  return String(v || "").trim();
}
function normalizeStylesToNames(arr) {
  const seen = new Set();
  const out = [];
  (Array.isArray(arr) ? arr : []).forEach((s) => {
    const name = pickStyleName(s);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ styleName: name });
  });
  return out;
}
function genderLabel(g) {
  if (!g) return "";
  const s = String(g).toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s;
}
function divisionLabel(d) {
  if (!d) return "";
  const g = genderLabel(d.gender);
  return g ? `${d.name} - ${g}` : d.name;
}

/* -------- timestamp helpers -------- */
function hmsToSeconds({ h = 0, m = 0, s = 0 }) {
  const H = Math.max(0, parseInt(h || 0, 10));
  const M = Math.max(0, parseInt(m || 0, 10));
  const S = Math.max(0, parseInt(s || 0, 10));
  return H * 3600 + M * 60 + S;
}
function secondsToHMS(total = 0) {
  const t = Math.max(0, parseInt(total || 0, 10));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return { h, m, s };
}
function parseTimestampFromUrl(url = "") {
  try {
    const u = new URL(url);
    const t = u.searchParams.get("t");
    const start = u.searchParams.get("start");
    let secs = 0;
    if (t) {
      if (/^\d+$/.test(t)) secs = parseInt(t, 10);
      else if (/^\d+s$/.test(t)) secs = parseInt(t, 10);
      else {
        const h = /(\d+)h/.exec(t)?.[1];
        const m = /(\d+)m/.exec(t)?.[1];
        const s = /(\d+)s/.exec(t)?.[1];
        secs =
          (h ? parseInt(h, 10) * 3600 : 0) +
          (m ? parseInt(m, 10) * 60 : 0) +
          (s ? parseInt(s, 10) : 0);
      }
      return Math.max(0, secs || 0);
    }
    if (start && /^\d+$/.test(start)) {
      return Math.max(0, parseInt(start, 10));
    }
  } catch {}
  return 0;
}

/* ----------------- small UI helper ----------------- */
const InfoBox = ({ children }) => (
  <div className="rounded-md border p-3 text-sm text-muted-foreground">
    {children}
  </div>
);

/* ----------------- TimestampInputs ----------------- */
function TimestampInputs({ valueSeconds = 0, onChange }) {
  const [hh, setHh] = useState("");
  const [mm, setMm] = useState("");
  const [ss, setSs] = useState("");

  useEffect(() => {
    const { h, m, s } = secondsToHMS(valueSeconds || 0);
    setHh(String(h));
    setMm(String(m));
    setSs(String(s));
  }, [valueSeconds]);

  const toInt = (str) => {
    if (str === "" || str == null) return 0;
    const n = parseInt(String(str).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const emit = (hStr, mStr, sStr) => {
    const next = hmsToSeconds({
      h: toInt(hStr),
      m: toInt(mStr),
      s: toInt(sStr),
    });
    onChange?.(next);
  };

  return (
    <div className="mt-4">
      <label className="block text-base font-semibold mb-2">Timestamp</label>
      <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">
        If no timestamp is added, the video will start from the beginning.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Hours</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2"
            value={hh}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setHh(raw);
              emit(raw, mm, ss);
            }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Minutes</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2"
            value={mm}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setMm(raw);
              emit(hh, raw, ss);
            }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Seconds</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2"
            value={ss}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setSs(raw);
              emit(hh, mm, raw);
            }}
          />
        </div>
      </div>
    </div>
  );
}

const ScoutingReportForm = ({
  athlete,
  report,
  styles,
  techniques,
  userType,
  setOpen,
  onSuccess,
}) => {
  console.log("SCOUTING FORM STYLES PROP:", styles);
  const router = useRouter();
  const { user } = useUser();
  const viewerUserId = user?._id;

  /* --------------------- styles (no fallback) ---------------------- */
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [normalizedStyles, setNormalizedStyles] = useState([]); // [{styleName}]

  useEffect(() => {
    const norm = normalizeStylesToNames(styles);
    setNormalizedStyles(norm);
    setStylesLoaded(true);
  }, [styles]);

  /* --------------------- DIVISIONS & WEIGHTS ---------------------- */
  const [divisions, setDivisions] = useState([]); // [{value,label,gender}]
  const [divisionId, setDivisionId] = useState(() =>
    toDivisionId(report?.division),
  );
  const [divisionsLoading, setDivisionsLoading] = useState(false);

  const [weightOptions, setWeightOptions] = useState([]); // [{value,label}]
  const [weightCategoryId, setWeightCategoryId] = useState(
    () => String(report?.weightCategory ?? report?.weightItemId ?? ""), // support legacy
  );
  const [weightLabel, setWeightLabel] = useState(report?.weightLabel || "");
  const [weightUnit, setWeightUnit] = useState(report?.weightUnit || "");
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState("");

  // Gate: style
  const [matchType, setMatchType] = useState(
    report?.matchType || report?.style || report?.styleName || "",
  );

  const styleOptions = useMemo(() => {
    const base = (normalizedStyles || []).map((s) => ({
      value: s.styleName,
      label: s.styleName,
    }));
    if (
      matchType &&
      !base.some(
        (o) =>
          String(o.value).toLowerCase() === String(matchType).toLowerCase(),
      )
    ) {
      base.unshift({ value: matchType, label: `${matchType} (from report)` });
    }
    return base;
  }, [normalizedStyles, matchType]);

  // Refs to apply saved division/weight exactly once on edit
  const initialDivisionId = report?.division
    ? String(report.division?._id ?? report.division)
    : "";
  // accept either weightCategory or legacy weightItemId
  const initialWeightCategoryCandidate =
    report?.weightCategory ?? report?.weightItemId ?? "";
  const initialWeightCategoryId = initialWeightCategoryCandidate
    ? String(initialWeightCategoryCandidate)
    : "";
  const initialWeightLabelRef = useRef(report?.weightLabel || "");
  const initialWeightUnitRef = useRef(report?.weightUnit || "");
  const appliedInitialDivisionRef = useRef(false);
  const appliedInitialWeightRef = useRef(false);

  // ------------- DIVISIONS after style -------------
  useEffect(() => {
    let alive = true;

    const isEditingSameStyle =
      !!report &&
      !!matchType &&
      String(matchType).toLowerCase() ===
        String(
          report.matchType || report.style || report.styleName || "",
        ).toLowerCase();

    // Reset only if user actually changed style away from saved one
    if (!isEditingSameStyle) {
      setDivisions([]);
      setDivisionId("");
      setWeightOptions([]);
      setWeightCategoryId("");
      setWeightLabel("");
      setWeightUnit("");
      setWeightsError("");
      appliedInitialDivisionRef.current = false;
      appliedInitialWeightRef.current = false;
    } else {
      setWeightsError("");
    }

    const name = (matchType || "").trim();
    if (!name) return;

    (async () => {
      try {
        setDivisionsLoading(true);
        const res = await fetch(
          `/api/divisions?styleName=${encodeURIComponent(name)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: { accept: "application/json" },
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const opts = (data?.divisions || []).map((d) => ({
          value: String(d._id),
          label: divisionLabel(d),
          gender: d.gender || null,
        }));
        setDivisions(opts);

        // Auto-apply saved division (only once)
        if (
          isEditingSameStyle &&
          initialDivisionId &&
          !appliedInitialDivisionRef.current
        ) {
          const hasIt = opts.some(
            (o) => String(o.value) === String(initialDivisionId),
          );
          if (hasIt) setDivisionId(String(initialDivisionId));
          appliedInitialDivisionRef.current = true;
        }
      } catch (err) {
        console.warn("[ScoutingReportForm] divisions fetch error:", err);
        if (!alive) return;
        setDivisions([]);
      } finally {
        setDivisionsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchType]);

  // ------------- WEIGHTS after division -------------
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    // BEFORE
    // const id = String(divisionId || "");
    // if (!id) { ... return; }

    // AFTER: normalize and guard
    const id = toDivisionId(divisionId);
    if (!id || id === "[object Object]") {
      setWeightOptions([]);
      setWeightCategoryId("");
      setWeightLabel("");
      setWeightUnit("");
      setWeightsError("");
      appliedInitialWeightRef.current = false;
      return;
    }

    (async () => {
      try {
        setWeightsLoading(true);
        const url = `/api/divisions/${encodeURIComponent(id)}/weights`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (!alive) return;
          if (res.status !== 404) {
            console.warn("[ScoutingReportForm] weights fetch non-200", {
              url,
              status: res.status,
              text,
            });
          }
          setWeightOptions([]);
          setWeightsError(
            res.status === 404
              ? ""
              : `Failed to load weights (HTTP ${res.status}).`,
          );
          return;
        }

        let data;
        try {
          data = await res.json();
        } catch (e) {
          if (!alive) return;
          console.warn("[ScoutingReportForm] weights JSON parse error:", e);
          setWeightsError("Weights endpoint did not return JSON.");
          return;
        }
        if (!alive) return;

        const wc = data?.weightCategory || {};
        const unit = wc?.unit || data?.unit || "";
        const items = Array.isArray(wc?.items) ? wc.items : [];

        const opts = items
          .map((i, idx) => {
            let lbl =
              (typeof i === "string" && i) ||
              i?.label ||
              i?.name ||
              i?.title ||
              i?.weight ||
              i?.class ||
              "";
            if (!lbl && (i?.min != null || i?.max != null)) {
              const lo = i?.min ?? i?.lower ?? i?.low ?? null;
              const hi = i?.max ?? i?.upper ?? i?.high ?? null;
              if (lo != null && hi != null)
                lbl = `${lo}-${hi}${unit ? ` ${unit}` : ""}`;
              else if (hi != null) lbl = `≤ ${hi}${unit ? ` ${unit}` : ""}`;
              else if (lo != null) lbl = `≥ ${lo}${unit ? ` ${unit}` : ""}`;
            }
            lbl = String(lbl || "").trim();
            if (!lbl) return null;
            const val = String(i?._id ?? i?.value ?? i?.id ?? lbl ?? idx);
            return { value: val, label: lbl };
          })
          .filter(Boolean);

        setWeightOptions(opts);
        setWeightUnit(String(unit || ""));

        // Auto-apply saved weight on edit (by id first, then by label)
        if (!appliedInitialWeightRef.current) {
          if (initialWeightCategoryId) {
            const byId = opts.find(
              (o) => String(o.value) === String(initialWeightCategoryId),
            );
            if (byId) {
              setWeightCategoryId(String(initialWeightCategoryId));
              setWeightLabel(byId.label ?? "");
              if (initialWeightUnitRef.current)
                setWeightUnit(initialWeightUnitRef.current);
              appliedInitialWeightRef.current = true;
            }
          }
          if (!appliedInitialWeightRef.current) {
            const savedLabel = (initialWeightLabelRef.current || "")
              .trim()
              .toLowerCase();
            if (savedLabel) {
              const byLabel = opts.find(
                (o) => String(o.label).trim().toLowerCase() === savedLabel,
              );
              if (byLabel) {
                setWeightCategoryId(String(byLabel.value));
                setWeightLabel(byLabel.label);
                if (initialWeightUnitRef.current)
                  setWeightUnit(initialWeightUnitRef.current);
                appliedInitialWeightRef.current = true;
              }
            }
          }
          // If nothing matched, keep whatever label/unit we had; user can re-pick.
        }

        if (!opts.length) setWeightsError("");
      } catch (err) {
        if (controller.signal.aborted) return;
        console.warn("[ScoutingReportForm] weights fetch error:", err);
        if (!alive) return;
        setWeightsError("");
        setWeightOptions([]);
      } finally {
        setWeightsLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId]);

  /* --------------------- rest of form state ---------------------- */
  const [athleteFirstName, setAthleteFirstName] = useState(
    report?.athleteFirstName || "",
  );
  const [athleteLastName, setAthleteLastName] = useState(
    report?.athleteLastName || "",
  );
  const [athleteNationalRank, setAthleteNationalRank] = useState(
    report?.athleteNationalRank || "",
  );
  const [athleteWorldRank, setAthleteWorldRank] = useState(
    report?.athleteWorldRank || "",
  );

  const [athleteClub, setAthleteClub] = useState(report?.athleteClub || "");
  const [athleteCountry, setAthleteCountry] = useState(
    report?.athleteCountry || "",
  );
  const [athleteRank, setAthleteRank] = useState(report?.athleteRank || "");
  const [athleteGrip, setAthleteGrip] = useState(report?.athleteGrip || "");
  const [athleteAttackNotes, setAthleteAttackNotes] = useState(
    report?.athleteAttackNotes || "",
  );
  const [accessList, setAccessList] = useState(report?.accessList || []);

  // techniques
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [athleteSelected, setAthleteSelected] = useState(
    report?.athleteAttacks?.map((item, i) => ({ value: i, label: item })) || [],
  );

  // ----- videos -----
  const normalizedExistingVideos = useMemo(() => {
    const src = Array.isArray(report?.videos) ? report.videos : [];
    return src.map((v) =>
      typeof v === "string"
        ? v
        : {
            ...v,
            startSeconds: Math.max(0, parseInt(v?.startSeconds ?? 0, 10)) || 0,
          },
    );
  }, [report?.videos]);

  const [videos, setVideos] = useState(normalizedExistingVideos);
  const [newVideos, setNewVideos] = useState([]);
  const [deletedVideos, setDeletedVideos] = useState([]);

  useEffect(() => {
    const fromProps = (() => {
      const arr = extractArray(techniques);
      return arr.length ? arr : [];
    })();

    if (fromProps.length) {
      setLoadedTechniques(
        fromProps.map((t, i) => {
          const label =
            typeof t === "string"
              ? t
              : (t?.name ?? t?.label ?? t?.title ?? t?.technique ?? "");
          return { label, value: t?._id ?? t?.id ?? i };
        }),
      );
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/techniques", {
          headers: { accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        const arr = extractArray(data);
        setLoadedTechniques(
          arr.map((t, i) => {
            const label =
              typeof t === "string"
                ? t
                : (t?.name ?? t?.label ?? t?.title ?? t?.technique ?? "");
            return { label, value: t?._id ?? t?.id ?? i };
          }),
        );
      } catch {
        setLoadedTechniques([]);
      }
    })();
  }, [techniques]);

  const suggestions = useMemo(
    () =>
      [...loadedTechniques].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    [loadedTechniques],
  );

  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    [],
  );
  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    [],
  );

  /* --------------------- submit ---------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!matchType) {
      toast.error("Please choose a match type (style) first.");
      return;
    }

    const payload = {
      reportFor: [{ athleteId: athlete._id, athleteType: userType }],
      createdById: user?._id,
      createdByName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
      matchType,

      division: divisionId || undefined,
      weightCategory: weightCategoryId || undefined, // <- always item id
      weightLabel: weightLabel || undefined,
      weightUnit: weightUnit || undefined,

      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      athleteClub,
      athleteCountry,
      athleteRank,
      athleteGrip,
      athleteAttacks: athleteSelected.map((item) => item.label.toLowerCase()),
      athleteAttackNotes,
      accessList,

      updatedVideos: (videos || [])
        .filter((v) => v && v._id)
        .map((v) => ({
          ...v,
          startSeconds: Math.max(
            0,
            parseInt(
              typeof v.startSeconds === "number"
                ? v.startSeconds
                : v?.startSeconds || 0,
              10,
            ),
          ),
        })),
      newVideos: (newVideos || []).map((v) => ({
        ...v,
        startSeconds: Math.max(
          0,
          parseInt(
            typeof v.startSeconds === "number"
              ? v.startSeconds
              : v?.startSeconds || 0,
            10,
          ),
        ),
      })),
      deletedVideos,
    };

    const method = report ? "PATCH" : "POST";
    const base = "/api/dashboard";
    const url =
      userType === "family"
        ? report
          ? `${base}/${athlete.userId}/family/${athlete._id}/scoutingReports/${report._id}`
          : `${base}/${athlete.userId}/family/${athlete._id}/scoutingReports`
        : report
          ? `${base}/${viewerUserId}/scoutingReports/${report._id}`
          : `${base}/${viewerUserId}/scoutingReports`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Scouting report saved.");
        onSuccess?.();

        scoutingReportCreated({
          style: matchType,
          userType,
          hasVideos: (videos?.length || 0) + (newVideos?.length || 0) > 0,
        });

        setOpen?.(false);
        router.refresh();
      } else {
        toast.error(data.message || "Failed to save scouting report.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving the scouting report.");
    }
  };

  /* --------------------- early returns + gating ---------------------- */
  if (!stylesLoaded) {
    return (
      <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900/30">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  const noStyles = (normalizedStyles || []).length === 0;
  if (noStyles) {
    if (userType === "family") {
      return (
        <div className="rounded-lg border p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-semibold">
            You need a style/sport to add a scouting report.
          </p>
          <p className="text-sm mt-1">
            Please go to the <strong>Styles</strong> tab for this family member
            and add a style before creating a scouting report.
          </p>
        </div>
      );
    }

    const stylesHref = `/dashboard/styles`;
    return (
      <div className="rounded-lg border p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        <p className="font-semibold">
          You need a style/sport to add a scouting report.
        </p>
        <p className="text-sm mt-1">
          Please add a style to this profile before creating a scouting report.
        </p>
        <div className="mt-3">
          <Link
            href={stylesHref}
            onClick={() => setOpen?.(false)}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium underline hover:no-underline"
          >
            Go to Styles
          </Link>
        </div>
      </div>
    );
  }

  const hasStyle = !!matchType;
  const hasDivision = !!divisionId;

  /* --------------------- render ---------------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* STYLE */}
      <FormSelect
        label="Match Type"
        placeholder="Select style/sport..."
        value={matchType}
        onChange={(val) => setMatchType(val)}
        options={styleOptions}
      />

      {/* Rest appears after style chosen */}
      {hasStyle && (
        <>
          {/* Division */}
          {divisionsLoading ? (
            <InfoBox>Loading divisions…</InfoBox>
          ) : (
            <FormSelect
              label="Division"
              placeholder={
                divisions.length ? "Select division..." : "No divisions found"
              }
              value={divisionId}
              onChange={(val) => setDivisionId(toDivisionId(val))}
              options={divisions}
              disabled={!divisions.length}
            />
          )}

          {/* Weight */}
          {!hasDivision && (
            <InfoBox>Select a division to load weight categories.</InfoBox>
          )}

          {hasDivision &&
            (weightsLoading ? (
              <InfoBox>Loading weight categories…</InfoBox>
            ) : weightsError ? (
              <div className="rounded-md border p-3 text-sm text-red-600 dark:text-red-400">
                {weightsError}
              </div>
            ) : (
              <FormSelect
                label="Weight Category"
                placeholder={
                  weightOptions.length
                    ? "Select weight..."
                    : "No weight categories for this division"
                }
                value={weightCategoryId}
                onChange={(val) => {
                  const opt = (weightOptions || []).find(
                    (o) => String(o.value) === String(val),
                  );
                  setWeightCategoryId(String(val));
                  setWeightLabel(opt?.label ?? "");
                }}
                options={weightOptions}
                disabled={!weightOptions.length}
              />
            ))}

          {/* Athlete Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Athlete First Name"
              name="athleteFirstName"
              value={athleteFirstName}
              onChange={(e) => setAthleteFirstName(e.target.value)}
              required
            />
            <FormField
              label="Athlete Last Name"
              name="athleteLastName"
              value={athleteLastName}
              onChange={(e) => setAthleteLastName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="National Rank"
              name="athleteNationalRank"
              value={athleteNationalRank}
              onChange={(e) => setAthleteNationalRank(e.target.value)}
            />
            <FormField
              label="World Rank"
              name="athleteWorldRank"
              value={athleteWorldRank}
              onChange={(e) => setAthleteWorldRank(e.target.value)}
            />
          </div>

          <FormField
            label="Club"
            name="athleteClub"
            value={athleteClub}
            onChange={(e) => setAthleteClub(e.target.value)}
          />

          <CountrySelect
            label="Country"
            value={athleteCountry}
            onChange={setAthleteCountry}
          />

          {/* Grip */}
          <div>
            <label className="block mb-1 font-medium">Grip</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="athleteGrip"
                  value="Righty"
                  checked={athleteGrip === "Righty"}
                  onChange={(e) => setAthleteGrip(e.target.value)}
                />
                Righty
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="athleteGrip"
                  value="Lefty"
                  checked={athleteGrip === "Lefty"}
                  onChange={(e) => setAthleteGrip(e.target.value)}
                />
                Lefty
              </label>
            </div>
          </div>

          {/* Techniques */}
          <TechniqueTagInput
            label="Known Attacks"
            name="athleteAttacks"
            suggestions={suggestions}
            selected={athleteSelected}
            onAdd={(tag) => setAthleteSelected((prev) => [...prev, tag])}
            onDelete={(i) =>
              setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i))
            }
          />

          {/* Notes */}
          <Editor
            name="athleteAttackNotes"
            text={athleteAttackNotes}
            onChange={setAthleteAttackNotes}
            label="Attack Notes"
          />

          {/* Videos */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Videos</h3>

            {(videos || []).map((vid, idx) => {
              const isIdOnly = typeof vid === "string";
              const title = isIdOnly ? "" : vid.title || vid.videoTitle || "";
              const notes = isIdOnly ? "" : vid.notes || vid.videoNotes || "";
              const url = isIdOnly ? "" : vid.url || vid.videoURL || "";
              const startSeconds = isIdOnly
                ? 0
                : Math.max(0, parseInt(vid?.startSeconds || 0, 10));

              const idMatch = (url || "").match(
                /(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i,
              );
              const embedId = idMatch ? idMatch[1] : null;

              return (
                <div
                  key={vid._id ?? idx}
                  className="bg-muted p-4 rounded-lg mb-4"
                >
                  {isIdOnly ? (
                    <div className="text-sm text-muted-foreground">
                      This report has an existing video (ID: {vid}). It can't be
                      edited here because only an id was loaded. It will be kept
                      on save.
                    </div>
                  ) : (
                    <>
                      <FormField
                        label="Video Title"
                        value={title}
                        onChange={(e) => {
                          const next = [...videos];
                          next[idx] = {
                            ...(next[idx] || {}),
                            title: e.target.value,
                          };
                          setVideos(next);
                        }}
                      />
                      <Editor
                        name={`existing_notes_${idx}`}
                        text={notes}
                        onChange={(val) => {
                          const next = [...videos];
                          next[idx] = { ...(next[idx] || {}), notes: val };
                          setVideos(next);
                        }}
                        label="Video Notes"
                      />
                      <FormField
                        label="YouTube URL"
                        value={url}
                        onChange={(e) => {
                          const next = [...videos];
                          const parsed = parseTimestampFromUrl(e.target.value);
                          const prev = Math.max(
                            0,
                            parseInt(next[idx]?.startSeconds || 0, 10),
                          );
                          next[idx] = {
                            ...(next[idx] || {}),
                            url: e.target.value,
                            startSeconds: parsed ? parsed : prev,
                          };
                          setVideos(next);
                        }}
                      />

                      <TimestampInputs
                        valueSeconds={startSeconds}
                        onChange={(nextSecs) => {
                          const next = [...videos];
                          next[idx] = {
                            ...(next[idx] || {}),
                            startSeconds: Math.max(
                              0,
                              parseInt(nextSecs || 0, 10),
                            ),
                          };
                          setVideos(next);
                        }}
                      />

                      {embedId && (
                        <iframe
                          className="mt-3 w-full h-52"
                          src={`https://www.youtube.com/embed/${embedId}?start=${Math.max(
                            0,
                            parseInt(videos[idx]?.startSeconds || 0, 10),
                          )}`}
                          allowFullScreen
                        />
                      )}

                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (vid._id)
                              setDeletedVideos((prev) => [
                                ...prev,
                                String(vid._id),
                              ]);
                            setVideos((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }}
                        >
                          Remove This Video
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {newVideos.map((vid, idx) => {
              const url = vid.url || "";
              const idMatch = url.match(
                /(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i,
              );
              const embedId = idMatch ? idMatch[1] : null;
              const startSeconds = Math.max(
                0,
                parseInt(vid?.startSeconds || 0, 10),
              );

              return (
                <div
                  key={`new-${idx}`}
                  className="bg-muted p-4 rounded-lg mb-4"
                >
                  <FormField
                    label="Video Title"
                    value={vid.title || ""}
                    onChange={(e) => {
                      const next = [...newVideos];
                      next[idx] = {
                        ...(next[idx] || {}),
                        title: e.target.value,
                      };
                      setNewVideos(next);
                    }}
                  />
                  <Editor
                    name={`notes_${idx}`}
                    text={vid.notes || ""}
                    onChange={(val) => {
                      const next = [...newVideos];
                      next[idx] = { ...(next[idx] || {}), notes: val };
                      setNewVideos(next);
                    }}
                    label="Video Notes"
                  />
                  <FormField
                    label="YouTube URL"
                    value={url}
                    onChange={(e) => {
                      const next = [...newVideos];
                      const parsed = parseTimestampFromUrl(e.target.value);
                      next[idx] = {
                        ...(next[idx] || {}),
                        url: e.target.value,
                        startSeconds: parsed
                          ? parsed
                          : Math.max(
                              0,
                              parseInt(next[idx]?.startSeconds || 0, 10),
                            ),
                      };
                      setNewVideos(next);
                    }}
                  />

                  <TimestampInputs
                    valueSeconds={startSeconds}
                    onChange={(nextSecs) => {
                      const next = [...newVideos];
                      next[idx] = {
                        ...(next[idx] || {}),
                        startSeconds: Math.max(0, parseInt(nextSecs || 0, 10)),
                      };
                      setNewVideos(next);
                    }}
                  />

                  {embedId && (
                    <iframe
                      className="mt-3 w-full h-52"
                      src={`https://www.youtube.com/embed/${embedId}?start=${Math.max(
                        0,
                        parseInt(newVideos[idx]?.startSeconds || 0, 10),
                      )}`}
                      allowFullScreen
                    />
                  )}

                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setNewVideos((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="btn-add"
              onClick={() =>
                setNewVideos((prev) => [
                  ...prev,
                  { title: "", notes: "", url: "", startSeconds: 0 },
                ])
              }
            >
              <Plus size={16} /> Add {newVideos.length ? "Another" : "a"} Video
            </Button>
          </div>

          <div className="mt-4pt-4">
            <Button
              type="submit"
              className="btn-submit"
              disabled={!hasStyle || divisionsLoading || weightsLoading}
            >
              {report ? "Update" : "Submit"} Report
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

export default ScoutingReportForm;
