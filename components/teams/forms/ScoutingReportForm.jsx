"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";

// ✅ Shared Form Components
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import FormMultiSelect from "@/components/shared/FormMultiSelect";

const TeamScoutingReportForm = ({
  team,
  report,
  user,
  userStyles,
  onSuccess,
  setOpen,
}) => {
  const router = useRouter();
  const teamSlug = team?.teamSlug || ""; // ✅ Safe destructuring

  // Refs
  const newVideosRef = useRef([]);
  const deletedVideoIdsRef = useRef([]);

  // Dummy state to force rerender when using refs
  const [, forceRerender] = useState(0);

  // Core form state
  const [members, setMembers] = useState([]);
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
  const [athleteGrip, setAthleteGrip] = useState(report?.athleteGrip || "");
  const [athleteAttackNotes, setAthleteAttackNotes] = useState(
    report?.athleteAttackNotes || ""
  );
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [athleteSelected, setAthleteSelected] = useState(
    report?.athleteAttacks?.map((item, i) => ({ value: i, label: item })) || []
  );
  const [videos, setVideos] = useState(report?.videos || []);
  const [newVideos, setNewVideos] = useState([]);
  const [reportFor, setReportFor] = useState(report?.reportFor || []);

  // Fetch team members
  useEffect(() => {
    if (!teamSlug) return;
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/teams/${teamSlug}/members`);
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err) {
        console.error("Failed to load team members", err);
        toast.error("Failed to load team members");
      }
    };
    fetchMembers();
  }, [teamSlug]);

  const memberOptions = members.map((m) => ({
    value: m.familyMemberId || m.userId,
    label: m.name,
    athleteType: m.familyMemberId ? "family" : "user",
  }));

  // Fetch techniques
  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        const res = await fetch("/api/techniques");
        const data = await res.json();

        if (Array.isArray(data)) {
          setLoadedTechniques(data);
        } else {
          console.warn("Expected array but got:", data);
          setLoadedTechniques([]); // fallback to empty array
        }
      } catch (error) {
        console.error("Error fetching techniques:", error);
        setLoadedTechniques([]); // fallback
      }
    };

    fetchTechniques();
  }, []);

  const suggestions = loadedTechniques.map((t, i) => ({
    value: i,
    label: t.name,
  }));

  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    []
  );

  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );

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
      forceRerender((n) => n + 1); // ✅ force re-render
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      reportFor,
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving the report.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ✅ Select Athletes */}
      <FormMultiSelect
        label="Select Athletes"
        value={reportFor}
        onChange={setReportFor}
        options={memberOptions}
        placeholder="Select athletes..."
      />

      {/* ✅ Match Type */}
      <FormSelect
        label="Match Type"
        value={matchType}
        onChange={setMatchType}
        placeholder="Select match type..."
        options={userStyles.map((style) => ({
          value: style.styleName,
          label: style.styleName,
        }))}
      />

      {/* ✅ Athlete Info */}
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

      {/* ✅ Grip */}
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

      {/* ✅ Techniques */}
      <TechniqueTagInput
        label="Known Attacks"
        name="athleteAttacks"
        suggestions={suggestions}
        selected={athleteSelected}
        onAdd={onAthleteAdd}
        onDelete={onAthleteDelete}
      />

      {/* ✅ Notes */}
      <Editor
        name="athleteAttackNotes"
        text={athleteAttackNotes}
        onChange={setAthleteAttackNotes}
        label="Attack Notes"
      />

      {/* ✅ Videos */}
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
            {extractYouTubeID(vid.url) && (
              <iframe
                className="mt-3 w-full h-52"
                src={`https://www.youtube.com/embed/${extractYouTubeID(
                  vid.url
                )}`}
                allowFullScreen
              />
            )}
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
            {extractYouTubeID(vid.url) && (
              <iframe
                className="mt-3 w-full h-52"
                src={`https://www.youtube.com/embed/${extractYouTubeID(
                  vid.url
                )}`}
                allowFullScreen
              />
            )}
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
      >
        {report ? "Update Report" : "Submit Report"}
      </Button>
    </form>
  );
};

export default TeamScoutingReportForm;
