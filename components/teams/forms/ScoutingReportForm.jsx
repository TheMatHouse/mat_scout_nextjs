"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "@/components/shared/Editor";
import Select from "react-select";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";

const TeamScoutingReportForm = ({
  team,
  report,
  user,
  userStyles,
  onSuccess,
  setOpen,
}) => {
  console.log("team ", team);
  const router = useRouter();
  const { teamSlug } = team;
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
      const url = `/api/teams/${team.teamSlug}/scouting-reports/${report._id}/videos/${videoId}`;
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
    const updated = [...newVideos, { title: "", notes: "", url: "" }]; // ✅ includes notes by default
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

    console.log("PAYLOAD ", payload);

    const method = report ? "PATCH" : "POST";
    const url = report
      ? `/api/teams/${team.teamSlug}/scouting-reports/${report._id}`
      : `/api/teams/${team.teamSlug}/scouting-reports`;

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
    <Card className="p-6">
      <CardHeader>
        <CardTitle>
          {report ? "Update Scouting Report" : "Add Scouting Report"}
        </CardTitle>
        <CardDescription>
          Fill out the report for your team member(s).
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {members.length > 0 ? (
            <div>
              <Label>Select Athletes</Label>
              <Select
                isMulti
                options={memberOptions}
                value={memberOptions.filter((m) =>
                  reportFor.some(
                    (r) =>
                      r.athleteId === m.value && r.athleteType === m.athleteType
                  )
                )}
                onChange={(options) =>
                  setReportFor(
                    options.map((opt) => ({
                      athleteId: opt.value,
                      athleteType: opt.athleteType,
                    }))
                  )
                }
                className="mt-1"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: "#0f172a",
                    borderColor: state.isFocused ? "#3b82f6" : "#334155",
                    color: "#f8fafc",
                    boxShadow: "none",
                    ":hover": { borderColor: "#3b82f6" },
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#1e293b",
                    color: "#f8fafc",
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? "#334155" : "#1e293b",
                    color: "#f8fafc",
                    ":active": { backgroundColor: "#3b82f6" },
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: "#334155",
                    color: "#f8fafc",
                  }),
                  multiValueLabel: (base) => ({ ...base, color: "#f8fafc" }),
                  multiValueRemove: (base) => ({
                    ...base,
                    color: "#f8fafc",
                    ":hover": { backgroundColor: "#3b82f6", color: "white" },
                  }),
                  input: (base) => ({ ...base, color: "#f8fafc" }),
                  singleValue: (base) => ({ ...base, color: "#f8fafc" }),
                }}
              />
            </div>
          ) : (
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 italic">
              No team members available to share with.
            </div>
          )}

          <div>
            <Label>Match Type</Label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="">Select match type...</option>
              {userStyles.map((style) => (
                <option
                  key={style._id}
                  value={style.styleName}
                >
                  {style.styleName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Athlete First Name</Label>
            <Input
              value={athleteFirstName}
              onChange={(e) => setAthleteFirstName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Athlete Last Name</Label>
            <Input
              value={athleteLastName}
              onChange={(e) => setAthleteLastName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Division</Label>
            <Input
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            />
          </div>

          <div>
            <Label>Weight Category</Label>
            <Input
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
            />
          </div>

          <div>
            <Label>National Rank</Label>
            <Input
              value={athleteNationalRank}
              onChange={(e) => setAthleteNationalRank(e.target.value)}
            />
          </div>

          <div>
            <Label>World Rank</Label>
            <Input
              value={athleteWorldRank}
              onChange={(e) => setAthleteWorldRank(e.target.value)}
            />
          </div>

          <div>
            <Label>Club</Label>
            <Input
              value={athleteClub}
              onChange={(e) => setAthleteClub(e.target.value)}
            />
          </div>

          <div>
            <Label>Country</Label>
            <select
              value={athleteCountry}
              onChange={(e) => setAthleteCountry(e.target.value)}
              className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select country...</option>
              {Countries.map((c) => (
                <option
                  key={c.code3}
                  value={c.code3}
                >
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Grip</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Righty"
                  checked={athleteGrip === "Righty"}
                  onChange={() => setAthleteGrip("Righty")}
                />
                Righty
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Lefty"
                  checked={athleteGrip === "Lefty"}
                  onChange={() => setAthleteGrip("Lefty")}
                />
                Lefty
              </label>
            </div>
          </div>

          <div>
            <Label>Techniques Used</Label>
            <TechniqueTagInput
              name="athleteAttacks"
              suggestions={suggestions}
              selected={athleteSelected}
              onAdd={onAthleteAdd}
              onDelete={onAthleteDelete}
            />
          </div>

          <div>
            <Label>Technique Notes</Label>
            <Editor
              name="athleteAttackNotes"
              text={athleteAttackNotes}
              onChange={setAthleteAttackNotes}
            />
          </div>

          {/* Videos Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Match Videos</h3>

            {videos.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Existing Videos</h4>
                {videos.map((video, index) => (
                  <div
                    key={video._id}
                    className="border p-4 rounded-md space-y-2"
                  >
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={video.title}
                        onChange={(e) =>
                          handleVideoChange(index, "title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Editor
                        name="notes"
                        value={video.notes}
                        text={video.notes}
                        onChange={(val) =>
                          handleVideoChange(index, "notes", val)
                        }
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={video.url}
                        onChange={(e) =>
                          handleVideoChange(index, "url", e.target.value)
                        }
                      />

                      {extractYouTubeID(video.url) && (
                        <div className="mt-3">
                          <iframe
                            width="100%"
                            height="200"
                            src={`https://www.youtube.com/embed/${extractYouTubeID(
                              video.url
                            )}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => deleteVideo(video._id)}
                    >
                      Delete Video
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {newVideos.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">New Videos</h4>
                {newVideos.map((video, index) => (
                  <div
                    key={index}
                    className="border p-4 rounded-md space-y-2"
                  >
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={video.title}
                        onChange={(e) =>
                          handleNewVideoChange(index, "title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Editor
                        name="notes"
                        value={video.notes}
                        text={video.notes}
                        onChange={(val) =>
                          handleVideoChange(index, "notes", val, "new")
                        }
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={video.url}
                        onChange={(e) =>
                          handleNewVideoChange(index, "url", e.target.value)
                        }
                      />

                      {extractYouTubeID(video.url) && (
                        <div className="mt-3">
                          <iframe
                            width="100%"
                            height="200"
                            src={`https://www.youtube.com/embed/${extractYouTubeID(
                              video.url
                            )}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDeleteNewVideo(index)}
                    >
                      Delete New Video
                    </Button>
                  </div>
                ))}
              </div>
            )}

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
      </CardContent>
    </Card>
  );
};

export default TeamScoutingReportForm;
