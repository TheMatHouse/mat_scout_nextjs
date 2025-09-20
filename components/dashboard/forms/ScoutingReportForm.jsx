// components/dashboard/forms/ScoutingReportForm.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import { scoutingReportCreated } from "@/lib/analytics/adminEvents";

import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "../../shared/Editor";
import TechniqueTagInput from "../../shared/TechniqueTagInput";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

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

/* ----------------- small UI helper ----------------- */
const InfoBox = ({ children }) => (
  <div className="rounded-md border p-3 text-sm text-muted-foreground">
    {children}
  </div>
);

const ScoutingReportForm = ({
  athlete,
  report,
  styles, // provided by DashboardScouting
  techniques, // optional
  userType, // "user" | "family"
  setOpen,
  onSuccess,
}) => {
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
  const [divisionId, setDivisionId] = useState(report?.division || "");
  const [divisionsLoading, setDivisionsLoading] = useState(false);

  const [weightOptions, setWeightOptions] = useState([]); // [{value,label}]
  const [weightCategoryId, setWeightCategoryId] = useState(
    report?.weightCategory || ""
  ); // ← control by id
  const [weightLabel, setWeightLabel] = useState(report?.weightLabel || "");
  const [weightUnit, setWeightUnit] = useState(report?.weightUnit || "");
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState("");

  // Gate: only field visible initially
  const [matchType, setMatchType] = useState("");

  // Load divisions AFTER a style is chosen
  useEffect(() => {
    let alive = true;

    // reset chain when style changes
    setDivisions([]);
    setDivisionId("");
    setWeightOptions([]);
    setWeightCategoryId("");
    setWeightLabel("");
    setWeightUnit("");
    setWeightsError("");

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
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const opts = (data?.divisions || []).map((d) => ({
          value: d._id,
          label: divisionLabel(d),
          gender: d.gender || null,
        }));
        setDivisions(opts);
      } catch (err) {
        console.error("[ScoutingReportForm] divisions fetch error:", err);
        if (!alive) return;
        setDivisions([]);
      } finally {
        setDivisionsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [matchType]);

  // ---------------- Load weights AFTER a division is chosen ----------------
  useEffect(() => {
    let alive = true;

    // reset on division change
    setWeightOptions([]);
    setWeightCategoryId("");
    setWeightLabel("");
    setWeightUnit("");
    setWeightsError("");

    const id = String(divisionId || "");
    if (!id) return;

    (async () => {
      try {
        setWeightsLoading(true);

        const url = `/api/divisions/${id}/weights`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (!alive) return;
          console.error("[ScoutingReportForm] weights non-200", {
            url,
            status: res.status,
            text,
          });
          setWeightsError(`Failed to load weights (HTTP ${res.status}).`);
          return;
        }

        // parse JSON safely
        let data;
        try {
          data = await res.json();
        } catch (e) {
          if (!alive) return;
          console.error("[ScoutingReportForm] weights JSON parse error", e);
          setWeightsError("Weights endpoint did not return JSON.");
          return;
        }
        if (!alive) return;

        // ---- EXPECTED SHAPE { weightCategory: { _id, unit, items: [] } }
        const wc = data?.weightCategory || {};
        let unit = wc?.unit || data?.unit || "";
        let items = Array.isArray(wc?.items) ? wc.items : [];

        // Normalize options
        const opts = (Array.isArray(items) ? items : [])
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

            // Prefer DB id for value
            const val = String(i?._id ?? i?.value ?? i?.id ?? lbl ?? idx);
            return { value: val, label: lbl };
          })
          .filter(Boolean);

        setWeightOptions(opts);
        setWeightUnit(String(unit || ""));

        if (!opts.length) {
          console.warn("[ScoutingReportForm] No weight options parsed.", data);
          setWeightsError("No weight categories found for this division.");
        }
      } catch (err) {
        console.error("[ScoutingReportForm] weights fetch error:", err);
        if (!alive) return;
        setWeightsError("Unexpected error loading weights.");
        setWeightOptions([]);
        setWeightCategoryId("");
        setWeightLabel("");
        setWeightUnit("");
      } finally {
        setWeightsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId]);

  /* --------------------- rest of form state ---------------------- */
  const [athleteFirstName, setAthleteFirstName] = useState(
    report?.athleteFirstName || ""
  );
  const [athleteLastName, setAthleteLastName] = useState(
    report?.athleteLastName || ""
  );
  const [athleteNationalRank, setAthleteNationalRank] = useState(
    report?.athleteNationalRank || ""
  );
  const [athleteWorldRank, setAthleteWorldRank] = useState(
    report?.athleteWorldRank || ""
  );

  // If editing: prefill (style gating still applies when switching)
  useEffect(() => {
    if (report?.division && !divisionId) setDivisionId(String(report.division));
    if (report?.weightCategory && !weightCategoryId)
      setWeightCategoryId(String(report.weightCategory));
    if (report?.weightLabel && !weightLabel) setWeightLabel(report.weightLabel);
    if (report?.weightUnit && !weightUnit) setWeightUnit(report.weightUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [athleteClub, setAthleteClub] = useState(report?.athleteClub || "");
  const [athleteCountry, setAthleteCountry] = useState(
    report?.athleteCountry || ""
  );
  const [athleteRank, setAthleteRank] = useState(report?.athleteRank || "");
  const [athleteGrip, setAthleteGrip] = useState(report?.athleteGrip || "");
  const [athleteAttackNotes, setAthleteAttackNotes] = useState(
    report?.athleteAttackNotes || ""
  );
  const [accessList, setAccessList] = useState(report?.accessList || []);

  // techniques
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [athleteSelected, setAthleteSelected] = useState(
    report?.athleteAttacks?.map((item, i) => ({ value: i, label: item })) || []
  );
  const [videos, setVideos] = useState(report?.videos || []);
  const [newVideos, setNewVideos] = useState([]);

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
              : t?.name ?? t?.label ?? t?.title ?? t?.technique ?? "";
          return { label, value: t?._id ?? t?.id ?? i };
        })
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
                : t?.name ?? t?.label ?? t?.title ?? t?.technique ?? "";
            return { label, value: t?._id ?? t?.id ?? i };
          })
        );
      } catch {
        setLoadedTechniques([]);
      }
    })();
  }, [techniques]);

  const suggestions = useMemo(
    () =>
      [...loadedTechniques].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      ),
    [loadedTechniques]
  );

  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    []
  );
  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
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
      weightCategory: weightCategoryId || undefined, // id/value
      weightLabel: weightLabel || undefined, // snapshot text
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
      updatedVideos: videos.filter((v) => v._id),
      newVideos,
      deletedVideos: [],
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
    const stylesHref =
      userType === "family" && athlete?.userId && athlete?._id
        ? `/dashboard/${athlete.userId}/family/${athlete._id}/styles`
        : `/dashboard/styles`;

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
      {/* Always visible: STYLE */}
      <FormSelect
        label="Match Type"
        placeholder="Select style/sport..."
        value={matchType}
        onChange={(val) => setMatchType(val)}
        options={normalizedStyles.map((s) => ({
          value: s.styleName,
          label: s.styleName,
        }))}
      />

      {/* Everything else appears ONLY after a style is selected */}
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
              onChange={(val) => setDivisionId(val)}
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
                value={weightCategoryId} // CONTROL BY ID
                onChange={(val) => {
                  const opt = (weightOptions || []).find(
                    (o) => String(o.value) === String(val)
                  );
                  setWeightCategoryId(String(val)); // id/value
                  setWeightLabel(opt?.label ?? ""); // snapshot label
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

          <FormSelect
            label="Country"
            value={athleteCountry}
            onChange={setAthleteCountry}
            placeholder="Select country..."
            options={(Countries || []).map((c) => ({
              value: c.code3 ?? c.cca3 ?? c.code ?? c.name,
              label: c.name,
            }))}
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

            {newVideos.map((vid, idx) => {
              const idMatch = (vid.url || "").match(
                /(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/
              );
              const embedId = idMatch ? idMatch[1] : null;

              return (
                <div
                  key={idx}
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
                    value={vid.url || ""}
                    onChange={(e) => {
                      const next = [...newVideos];
                      next[idx] = { ...(next[idx] || {}), url: e.target.value };
                      setNewVideos(next);
                    }}
                  />
                  {embedId && (
                    <iframe
                      className="mt-3 w-full h-52"
                      src={`https://www.youtube.com/embed/${embedId}`}
                      allowFullScreen
                    />
                  )}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setNewVideos((prev) => [
                  ...prev,
                  { title: "", notes: "", url: "" },
                ])
              }
            >
              ➕ Add {newVideos.length ? "Another" : "a"} Video
            </Button>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="btn btn-primary"
              disabled={!hasStyle}
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
