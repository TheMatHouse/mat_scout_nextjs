"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "../../shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import { useUser } from "@/context/UserContext";

const ScoutingReportForm = ({
  athlete,
  report,
  styles,
  userType,
  setOpen,
  onSuccess,
}) => {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?._id;

  const newVideosRef = useRef([]);
  const deletedVideoIdsRef = useRef([]);
  const [, forceRerender] = useState(0); // Force re-render for refs

  // === State ===
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
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [athleteSelected, setAthleteSelected] = useState(
    report?.athleteAttacks?.map((item, i) => ({ value: i, label: item })) || []
  );
  const [videos, setVideos] = useState(report?.videos || []);
  const [newVideos, setNewVideos] = useState([]);

  // === Fetch techniques ===
  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        const res = await fetch("/api/techniques");
        const data = await res.json();
        if (Array.isArray(data)) {
          setLoadedTechniques(data);
        } else {
          setLoadedTechniques([]);
        }
      } catch (error) {
        console.error("Error fetching techniques:", error);
        setLoadedTechniques([]);
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

  // === Video management ===
  const updateVideoField = (index, field, value, isNew = false) => {
    if (isNew) {
      setNewVideos((prev) =>
        prev.map((vid, i) => (i === index ? { ...vid, [field]: value } : vid))
      );
    } else {
      setVideos((prev) =>
        prev.map((vid, i) => (i === index ? { ...vid, [field]: value } : vid))
      );
    }
  };

  const addNewVideo = () => {
    const newVideo = { title: "", notes: "", url: "" };
    setNewVideos((prev) => [...prev, newVideo]);
    newVideosRef.current.push(newVideo);
  };

  const deleteVideo = async (videoId) => {
    deletedVideoIdsRef.current.push(videoId);
    setVideos((prev) => prev.filter((v) => v._id !== videoId));
  };

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

  const extractYouTubeID = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  const userStyles = athlete?.userStyles || [];

  // === Submit ===
  const handleSubmit = async (e) => {
    e.preventDefault();

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
      newVideos: newVideosRef.current,
      deletedVideos: deletedVideoIdsRef.current || [],
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

      if (!res.ok) {
        toast.error(data.message || "Something went wrong");
        return;
      }

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
      {/* Match Type */}
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

      {/* Attack Notes */}
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
              onChange={(e) => updateVideoField(index, "title", e.target.value)}
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
              onChange={(e) => updateVideoField(index, "url", e.target.value)}
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
              onChange={(e) => {
                const updatedVideos = [...newVideos];
                updatedVideos[index].title = e.target.value;
                setNewVideos(updatedVideos);
                newVideosRef.current[index].title = e.target.value;
              }}
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
              onChange={(e) => {
                const updatedVideos = [...newVideos];
                updatedVideos[index].url = e.target.value;
                setNewVideos(updatedVideos);
                newVideosRef.current[index].url = e.target.value;
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
          onClick={addNewVideo}
          variant="outline"
        >
          ➕ Add {videos.length + newVideos.length ? "Another" : "a"} Video
        </Button>
      </div>

      <Button
        type="submit"
        className="btn btn-primary mt-4"
      >
        {report ? "Update" : "Submit"} Report
      </Button>
    </form>
  );
};

export default ScoutingReportForm;
