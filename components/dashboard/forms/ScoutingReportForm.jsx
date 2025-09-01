// components/dashboard/forms/ScoutingReportForm.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

const canon = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Normalize a variety of technique shapes into {label, value}
const normalizeTechniques = (arr) => {
  const seen = new Set();
  const out = [];
  (Array.isArray(arr) ? arr : []).forEach((t, i) => {
    let label = "";
    if (typeof t === "string") {
      label = t.trim();
    } else if (t && typeof t === "object") {
      label = String(
        t?.name ??
          t?.label ??
          t?.title ??
          t?.technique ??
          t?.techniqueName ??
          ""
      ).trim();
    }
    if (!label) return;
    const c = canon(label);
    if (seen.has(c)) return;
    seen.add(c);
    out.push({ label, value: t?._id ?? t?.id ?? c ?? i });
  });
  return out;
};

const ScoutingReportForm = ({
  athlete,
  report,
  styles, // fresh from API (like Matches)
  techniques, // prefer parent-supplied techniques
  userType, // "user" | "family"
  setOpen,
  onSuccess,
}) => {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?._id;

  // Normalize styles
  const normalizedStyles = useMemo(() => {
    const pick = (arr) =>
      Array.isArray(arr) && arr.length > 0 ? arr : undefined;
    const raw =
      pick(styles) ?? pick(athlete?.userStyles) ?? pick(athlete?.styles) ?? [];
    return raw
      .map((s) => {
        if (typeof s === "string") {
          const name = s.trim();
          return name ? { styleName: name } : null;
        }
        if (s && typeof s === "object") {
          const name = s.styleName || s.name || s.title || s.style || "";
          return name ? { styleName: name } : null;
        }
        return null;
      })
      .filter(Boolean);
  }, [styles, athlete?.userStyles, athlete?.styles]);

  // ---------- Form State ----------
  const [matchType, setMatchType] = useState(report?.matchType || "");
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
  const [division, setDivision] = useState(report?.division || "");
  const [weightCategory, setWeightCategory] = useState(
    report?.weightCategory || ""
  );
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

  // Techniques
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [athleteSelected, setAthleteSelected] = useState(
    report?.athleteAttacks?.map((item, i) => ({ value: i, label: item })) || []
  );

  const [videos, setVideos] = useState(report?.videos || []);
  const [newVideos, setNewVideos] = useState([]);

  // Prefer parent-provided techniques; otherwise fetch
  useEffect(() => {
    const fromProps = normalizeTechniques(techniques);
    if (fromProps.length) {
      setLoadedTechniques(fromProps);
      return;
    }

    // Fallback: fetch from API
    (async () => {
      try {
        const res = await fetch("/api/techniques", {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.techniques)
          ? data.techniques
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.results)
          ? data.results
          : [];
        setLoadedTechniques(normalizeTechniques(arr));
      } catch {
        setLoadedTechniques([]);
      }
    })();
  }, [techniques]);

  // Suggestions for the input (sorted)
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

  // If no matchType yet (new report), preselect first available style
  useEffect(() => {
    if (!matchType && normalizedStyles.length > 0) {
      setMatchType(normalizedStyles[0].styleName);
    }
  }, [normalizedStyles, matchType]);

  // YouTube helpers
  const extractYouTubeID = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!matchType) {
      toast.error("Please choose a match type (style) first.");
      return;
    }

    const payload = {
      reportFor: [{ athleteId: athlete._id, athleteType: userType }],
      createdById: athlete._id,
      createdByName: `${athlete.firstName} ${athlete.lastName}`,
      matchType,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      division,
      weightCategory,
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
        ? `${base}/${userId}/scoutingReports/${report._id}`
        : `${base}/${userId}/scoutingReports`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* No styles gate */}
      {normalizedStyles.length === 0 && (
        <div className="rounded-lg border p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-semibold">No styles found for this athlete.</p>
          <p className="text-sm">
            Please add a style to this profile before creating a scouting
            report.
          </p>
        </div>
      )}

      <FormSelect
        label="Match Type"
        placeholder={
          normalizedStyles.length
            ? "Select match type..."
            : "No styles available"
        }
        value={matchType}
        onChange={setMatchType}
        disabled={normalizedStyles.length === 0}
        options={normalizedStyles.map((s) => ({
          value: s.styleName,
          label: s.styleName,
        }))}
      />

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
        options={Countries.map((c) => ({
          value: c.code3,
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
        onAdd={onAthleteAdd}
        onDelete={onAthleteDelete}
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

        {newVideos.map((vid, idx) => (
          <div
            key={idx}
            className="bg-muted p-4 rounded-lg mb-4"
          >
            <FormField
              label="Video Title"
              value={vid.title || ""}
              onChange={(e) => {
                const next = [...newVideos];
                next[idx] = { ...(next[idx] || {}), title: e.target.value };
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
            {extractYouTubeID(vid.url) && (
              <iframe
                className="mt-3 w-full h-52"
                src={`https://www.youtube.com/embed/${extractYouTubeID(
                  vid.url
                )}`}
                allowFullScreen
              />
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setNewVideos((prev) => [...prev, { title: "", notes: "", url: "" }])
          }
        >
          ➕ Add {newVideos.length ? "Another" : "a"} Video
        </Button>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          className="btn btn-primary"
          disabled={normalizedStyles.length === 0}
        >
          {report ? "Update" : "Submit"} Report
        </Button>
      </div>
    </form>
  );
};

export default ScoutingReportForm;
