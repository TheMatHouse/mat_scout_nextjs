// components/teams/forms/ScoutingReportForm.jsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";
import Spinner from "@/components/shared/Spinner";

// Shared form inputs
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import FormMultiSelect from "@/components/shared/FormMultiSelect";

// ✅ Unified country picker (pinned + divider + theming)
import CountrySelect from "@/components/shared/CountrySelect";

const sortByLabel = (arr) =>
  [...arr].sort((a, b) =>
    String(a?.label ?? "").localeCompare(String(b?.label ?? ""), undefined, {
      sensitivity: "base",
    })
  );

const sortByName = (arr) =>
  [...arr].sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
      sensitivity: "base",
    })
  );

export default function TeamScoutingReportForm({
  team,
  report,
  user,
  onSuccess,
  setOpen,
}) {
  const router = useRouter();
  const teamSlug = team?.teamSlug || "";

  // Refs to manage “new videos” (not yet saved)
  const newVideosRef = useRef([]);
  const deletedVideoIdsRef = useRef([]);
  const [, forceRerender] = useState(0); // trigger rerenders when touching refs

  // Loading + fetched lists
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [members, setMembers] = useState([]);
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [styleOptions, setStyleOptions] = useState([]);

  // -----------------------
  // Form state (with reset)
  // -----------------------
  const [matchType, setMatchType] = useState(""); // keep placeholder by default
  const [athleteFirstName, setAthleteFirstName] = useState("");
  const [athleteLastName, setAthleteLastName] = useState("");
  const [athleteNationalRank, setAthleteNationalRank] = useState("");
  const [athleteWorldRank, setAthleteWorldRank] = useState("");
  const [division, setDivision] = useState("");
  const [weightCategory, setWeightCategory] = useState("");
  const [athleteClub, setAthleteClub] = useState("");
  const [athleteCountry, setAthleteCountry] = useState("");
  const [athleteGrip, setAthleteGrip] = useState("");
  const [athleteAttackNotes, setAthleteAttackNotes] = useState("");

  const [athleteSelected, setAthleteSelected] = useState([]);
  const [videos, setVideos] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [reportFor, setReportFor] = useState([]); // [{ value: id, label, athleteType }]

  // Reset state on report change (edit vs create)
  useEffect(() => {
    if (report) {
      setMatchType(report.matchType || "");
      setAthleteFirstName(report.athleteFirstName || "");
      setAthleteLastName(report.athleteLastName || "");
      setAthleteNationalRank(report.athleteNationalRank || "");
      setAthleteWorldRank(report.athleteWorldRank || "");
      setDivision(report.division || "");
      setWeightCategory(report.weightCategory || "");
      setAthleteClub(report.athleteClub || "");
      setAthleteCountry(report.athleteCountry || "");
      setAthleteGrip(report.athleteGrip || "");
      setAthleteAttackNotes(report.athleteAttackNotes || "");
      setAthleteSelected(
        Array.isArray(report.athleteAttacks)
          ? report.athleteAttacks.map((t, i) => ({ value: i, label: t }))
          : []
      );
      setVideos(Array.isArray(report.videos) ? report.videos : []);
      setNewVideos([]);
      newVideosRef.current = [];
      deletedVideoIdsRef.current = [];
      // reportFor is stored as [{ athleteId, athleteType }]
      setReportFor(
        Array.isArray(report.reportFor)
          ? report.reportFor.map((rf) => ({
              value: rf.athleteId,
              label: "", // will re-label once members load
              athleteType: rf.athleteType,
            }))
          : []
      );
    } else {
      // create new
      setMatchType("");
      setAthleteFirstName("");
      setAthleteLastName("");
      setAthleteNationalRank("");
      setAthleteWorldRank("");
      setDivision("");
      setWeightCategory("");
      setAthleteClub("");
      setAthleteCountry("");
      setAthleteGrip("");
      setAthleteAttackNotes("");
      setAthleteSelected([]);
      setVideos([]);
      setNewVideos([]);
      newVideosRef.current = [];
      deletedVideoIdsRef.current = [];
      setReportFor([]);
    }
  }, [report]);

  // -----------------------
  // Fetch: styles (global)
  // -----------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/styles", { cache: "no-store" });
        const data = await res.json();

        const opts = (Array.isArray(data) ? data : [])
          .map((s) => {
            const name =
              typeof s?.styleName === "string" ? s.styleName.trim() : "";
            return name ? { value: name, label: name } : null;
          })
          .filter(Boolean)
          .sort((a, b) =>
            String(a?.label ?? "").localeCompare(
              String(b?.label ?? ""),
              undefined,
              {
                sensitivity: "base",
              }
            )
          );

        if (alive) setStyleOptions(opts);
      } catch (e) {
        console.error("Failed to fetch styles:", e);
        if (alive) setStyleOptions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // -----------------------
  // Fetch: team members
  // -----------------------
  useEffect(() => {
    if (!teamSlug) return;
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await fetch(
          `/api/teams/${teamSlug}/members?ts=${Date.now()}`
        );
        if (!res.ok) throw new Error("Failed to load team members");
        const data = await res.json();
        const membersList = Array.isArray(data.members) ? data.members : [];
        setMembers(
          sortByName(membersList.map((m) => ({ ...m, name: m.name || "" })))
        );
      } catch (err) {
        console.error("Failed to load team members", err);
        toast.error("Failed to load team members");
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [teamSlug]);

  // map members -> multi-select options (sorted)
  const memberOptions = useMemo(() => {
    const opts = members.map((m) => ({
      value: m.familyMemberId || m.userId,
      label: m.name || "Unknown",
      athleteType: m.familyMemberId ? "family" : "user",
    }));
    const sorted = sortByLabel(opts);

    // If editing: fill missing labels for preselected reportFor
    if (report && Array.isArray(reportFor) && reportFor.length) {
      const map = new Map(sorted.map((o) => [String(o.value), o.label]));
      setReportFor((prev) =>
        prev.map((p) => ({
          ...p,
          label: map.get(String(p.value)) || p.label || "Unknown",
        }))
      );
    }
    return sorted;
  }, [members, report]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------
  // Fetch: techniques
  // -----------------------
  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        const res = await fetch("/api/techniques", { cache: "no-store" });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const sorted = [...arr].sort((a, b) =>
          String(a?.name ?? "").localeCompare(
            String(b?.name ?? ""),
            undefined,
            {
              sensitivity: "base",
            }
          )
        );
        setLoadedTechniques(sorted);
      } catch (error) {
        console.error("Error fetching techniques:", error);
        setLoadedTechniques([]);
      }
    };
    fetchTechniques();
  }, []);

  const suggestions = useMemo(
    () =>
      loadedTechniques.map((t, i) => ({
        value: i,
        label: t.name,
      })),
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

  // -----------------------
  // Video helpers
  // -----------------------
  const handleVideoChange = (index, field, value, type = "existing") => {
    if (type === "existing") {
      const updated = [...videos];
      if (!updated[index]) return;
      updated[index][field] = value;
      setVideos(updated);
    } else {
      const updated = [...newVideosRef.current];
      if (!updated[index]) return;
      updated[index][field] = value;
      newVideosRef.current = updated;
      forceRerender((n) => n + 1);
    }
  };

  const deleteVideo = async (videoId) => {
    try {
      const url = `/api/teams/${teamSlug}/scouting-reports/${report._id}/videos/${videoId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete video");

      setVideos((prev) => prev.filter((vid) => vid._id !== videoId));
      toast.success("Video deleted successfully");
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  const handleNewVideoChange = (index, field, value) => {
    const updated = [...newVideos];
    updated[index][field] = value;
    setNewVideos(updated);
    newVideosRef.current = updated;
  };
  const handleAddNewVideo = () => {
    const updated = [...newVideos, { title: "", notes: "", url: "" }];
    setNewVideos(updated);
    newVideosRef.current = updated;
  };
  const handleDeleteNewVideo = (index) => {
    const updated = [...newVideos];
    updated.splice(index, 1);
    setNewVideos(updated);
    newVideosRef.current = updated;
  };

  const extractYouTubeID = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  // -----------------------
  // Submit
  // -----------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!matchType) {
      toast.error("Please select a match type.");
      return;
    }

    const payload = {
      teamId: team._id,
      matchType,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      division,
      weightCategory,
      athleteClub,
      athleteCountry,
      athleteGrip,
      athleteAttacks: athleteSelected.map((item) => item.label.toLowerCase()),
      athleteAttackNotes,
      reportFor, // [{ value, label, athleteType }]
      updatedVideos: videos.filter((v) => v._id),
      newVideos: newVideosRef.current,
      deletedVideos: deletedVideoIdsRef.current || [],
    };

    const method = report ? "PATCH" : "POST";
    const url = report
      ? `/api/teams/${teamSlug}/scouting-reports/${report._id}`
      : `/api/teams/${teamSlug}/scouting-reports`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save report");

      toast.success(
        data?.message || (report ? "Report updated" : "Report created")
      );
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving the report.");
    }
  };

  if (loadingMembers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Spinner size={48} />
        <p className="text-gray-500 dark:text-gray-300 mt-3">
          Loading athletes…
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Select Athletes */}
      <FormMultiSelect
        label="Select Athletes"
        value={reportFor}
        onChange={setReportFor}
        options={memberOptions}
        placeholder="Select athletes..."
      />

      {/* Match Type */}
      <FormSelect
        label="Match Type"
        value={matchType}
        onChange={setMatchType}
        placeholder="Select match type..."
        options={styleOptions}
        required
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

      <FormField
        label="Division"
        name="division"
        value={division}
        onChange={(e) => setDivision(e.target.value)}
      />

      <FormField
        label="Weight Category"
        name="weightCategory"
        value={weightCategory}
        onChange={(e) => setWeightCategory(e.target.value)}
      />

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

      {/* ✅ Unified Country select (pinned + divider, themed correctly) */}
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

        {videos.map((vid, index) => (
          <div
            key={vid._id || index}
            className="bg-muted p-4 rounded-lg mb-4"
          >
            <FormField
              label="Video Title"
              value={vid.title}
              onChange={(e) =>
                handleVideoChange(index, "title", e.target.value)
              }
            />
            <Editor
              name="notes"
              text={vid.notes}
              onChange={(val) => handleVideoChange(index, "notes", val)}
              label="Video Notes"
            />
            <FormField
              label="YouTube URL"
              value={vid.url}
              onChange={(e) => handleVideoChange(index, "url", e.target.value)}
            />
            {(() => {
              const id = extractYouTubeID(vid.url);
              return id ? (
                <iframe
                  className="mt-3 w-full h-52"
                  src={`https://www.youtube.com/embed/${id}`}
                  allowFullScreen
                />
              ) : null;
            })()}
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteVideo(vid._id)}
              className="mt-2"
            >
              Delete
            </Button>
          </div>
        ))}

        {newVideos.map((vid, index) => (
          <div
            key={index}
            className="bg-muted p-4 rounded-lg mb-4"
          >
            <FormField
              label="Video Title"
              value={vid.title}
              onChange={(e) =>
                handleNewVideoChange(index, "title", e.target.value)
              }
            />
            <Editor
              name="notes"
              text={vid.notes}
              onChange={(val) => handleVideoChange(index, "notes", val, "new")}
              label="Video Notes"
            />
            <FormField
              label="YouTube URL"
              value={vid.url}
              onChange={(e) =>
                handleNewVideoChange(index, "url", e.target.value)
              }
            />
            {(() => {
              const id = extractYouTubeID(vid.url);
              return id ? (
                <iframe
                  className="mt-3 w-full h-52"
                  src={`https://www.youtube.com/embed/${id}`}
                  allowFullScreen
                />
              ) : null;
            })()}
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteNewVideo(index)}
              className="mt-2"
            >
              Delete New Video
            </Button>
          </div>
        ))}

        <Button
          type="button"
          onClick={handleAddNewVideo}
          variant="outline"
        >
          ➕ Add {videos.length + newVideos.length ? "Another" : "a"} Video
        </Button>
      </div>

      <Button
        type="submit"
        className="bg-ms-blue-gray hover:bg-ms-blue text-white"
        disabled={loadingMembers}
      >
        {report ? "Update Report" : "Submit Report"}
      </Button>
    </form>
  );
}
