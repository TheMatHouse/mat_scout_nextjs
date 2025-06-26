// Refactored and styled to match MatchReportForm
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useUser } from "@/context/UserContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "../../shared/Editor";
import { Textarea } from "@/components/ui/textarea";
import TagsAutocomplete from "@/components/shared/TagsAutocomplete";

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

  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        const res = await fetch("/api/techniques");
        const data = await res.json();
        setLoadedTechniques(data);
      } catch (err) {
        console.error("Failed to fetch techniques", err);
      }
    };
    fetchTechniques();
  }, []);

  const suggestions = loadedTechniques.map((t, i) => ({
    value: i,
    label: t.techniqueName,
  }));

  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    []
  );
  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );

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

    console.log("New video added:", newVideo);
    console.log("All newVideosRef.current:", newVideosRef.current);
  };

  const deleteVideo = async (videoId) => {
    try {
      let url = "";

      if (userType === "family") {
        url = `/api/dashboard/${athlete.userId}/family/${athlete._id}/scoutingReports/${report._id}/videos/${videoId}`;
      } else {
        url = `/api/dashboard/${athlete.userId}/scoutingReports/${report._id}/videos/${videoId}`;
      }

      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete video");
      }

      // ✅ Update local state after deletion
      setVideos((prev) => prev.filter((vid) => vid._id !== videoId));
      toast.success("Video deleted successfully");
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  const extractYouTubeID = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  const userStyles = athlete?.userStyles || [];

  console.log("ATHLETE ", athlete);
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      athleteId: athlete._id,
      athleteType: userType,
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
      newVideos: newVideosRef.current, // ✅ THIS IS THE FIX
      deletedVideos: deletedVideoIdsRef.current || [],
    };

    const method = report ? "PATCH" : "POST";
    const base = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard`;
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
    <Card className="p-6 shadow-md">
      <CardHeader>
        <CardTitle>
          {report ? "Update Scouting Report" : "Add Scouting Report"}
        </CardTitle>
        <CardDescription>
          {report
            ? "Edit your scouting details."
            : "Fill out the form below to create a new report."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <Label htmlFor="matchType">Match Type</Label>
            <select
              id="matchType"
              name="matchType"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
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
            <Label htmlFor="athleteFirstName">Athlete First Name</Label>
            <Input
              id="athleteFirstName"
              value={athleteFirstName}
              onChange={(e) => setAthleteFirstName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="athleteLastName">Athlete Last Name</Label>
            <Input
              id="athleteLastName"
              value={athleteLastName}
              onChange={(e) => setAthleteLastName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="division">Division</Label>
            <Input
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="weightCategory">Weight Category</Label>
            <Input
              id="weightCategory"
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="athleteNationalRank">National Rank</Label>
            <Input
              id="athleteNationalRank"
              value={athleteNationalRank}
              onChange={(e) => setAthleteNationalRank(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="athleteWorldRank">World Rank</Label>
            <Input
              id="athleteWorldRank"
              value={athleteWorldRank}
              onChange={(e) => setAthleteWorldRank(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="athleteClub">Club</Label>
            <Input
              id="athleteClub"
              value={athleteClub}
              onChange={(e) => setAthleteClub(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="athleteCountry">Country</Label>
            <select
              id="athleteCountry"
              value={athleteCountry}
              onChange={(e) => setAthleteCountry(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select country...</option>
              {Countries.map((country) => (
                <option
                  key={country.code3}
                  value={country.code3}
                >
                  {country.name}
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

          <div>
            <Label>Your Techniques</Label>
            <TagsAutocomplete
              label="Known Attacks"
              name="athleteAttacks"
              suggestions={suggestions}
              tags={athleteSelected}
              onAdd={onAthleteAdd}
              onDelete={onAthleteDelete}
            />
            {/* <Tags
              labelText="Athlete Attacks"
              name="athleteAttacks"
              selected={athleteSelected}
              suggestions={suggestions}
              onAdd={onAthleteAdd}
              onDelete={onAthleteDelete}
            /> */}
          </div>

          <div>
            <Label>Attack Notes</Label>
            <Editor
              name="athleteAttackNotes"
              text={athleteAttackNotes}
              onChange={setAthleteAttackNotes}
            />
          </div>

          {/* Video Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Videos</h3>

            {videos.map((vid, index) => (
              <div
                key={vid._id || index}
                className="bg-muted p-4 rounded-lg mb-4"
              >
                <Label>Video Title</Label>
                <Input
                  type="text"
                  value={vid.title}
                  onChange={(e) =>
                    updateVideoField(index, "title", e.target.value)
                  }
                />

                <Label className="mt-2">Video Notes</Label>
                <Textarea
                  value={vid.notes}
                  onChange={(e) =>
                    updateVideoField(index, "notes", e.target.value)
                  }
                />

                <Label className="mt-2">YouTube URL</Label>
                <Input
                  type="url"
                  value={vid.url}
                  onChange={(e) =>
                    updateVideoField(index, "url", e.target.value)
                  }
                />

                {extractYouTubeID(vid.url) && (
                  <div className="mt-3">
                    <iframe
                      width="100%"
                      height="200"
                      src={`https://www.youtube.com/embed/${extractYouTubeID(
                        vid.url
                      )}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
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
                className="space-y-2 border-t pt-4 mt-4 mb-2"
              >
                <div>
                  <Label htmlFor={`new-video-title-${index}`}>
                    Video Title
                  </Label>
                  <Input
                    id={`new-video-title-${index}`}
                    value={vid.title}
                    onChange={(e) => {
                      const updatedVideos = [...newVideos];
                      updatedVideos[index].title = e.target.value;
                      setNewVideos(updatedVideos);
                      newVideosRef.current[index].title = e.target.value;
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor={`new-video-notes-${index}`}>
                    Video Notes
                  </Label>
                  <textarea
                    id={`new-video-notes-${index}`}
                    className="w-full rounded-md border px-3 py-2 text-sm shadow-sm dark:bg-gray-800 dark:text-white"
                    value={vid.notes}
                    onChange={(e) => {
                      const updatedVideos = [...newVideos];
                      updatedVideos[index].notes = e.target.value;
                      setNewVideos(updatedVideos);
                      newVideosRef.current[index].notes = e.target.value;
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor={`new-video-url-${index}`}>Video URL</Label>
                  <Input
                    id={`new-video-url-${index}`}
                    value={vid.url}
                    onChange={(e) => {
                      const updatedVideos = [...newVideos];
                      updatedVideos[index].url = e.target.value;
                      setNewVideos(updatedVideos);
                      newVideosRef.current[index].url = e.target.value;
                    }}
                  />
                </div>

                {extractYouTubeID(vid.url) && (
                  <div className="mt-3">
                    <iframe
                      width="100%"
                      height="200"
                      src={`https://www.youtube.com/embed/${extractYouTubeID(
                        vid.url
                      )}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
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
            className="bg-ms-blue-gray hover:bg-ms-blue text-white mt-4"
          >
            {report ? "Update" : "Submit"} Report
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ScoutingReportForm;
