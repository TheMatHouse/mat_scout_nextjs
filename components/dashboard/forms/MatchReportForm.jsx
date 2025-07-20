// Updated MatchReportForm.jsx to support both user and family member match reports
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import moment from "moment";
import { useUser } from "@/context/UserContext";

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
import Editor from "../../shared/Editor";
import TechniqueTagInput from "../../shared/TechniqueTagInput";

const MatchReportForm = ({
  athlete,
  match,
  styles,
  techniques,
  type,
  setOpen,
  onSuccess,
  userType,
}) => {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [matchType, setMatchType] = useState(match?.matchType || "");
  const [eventName, setEventName] = useState(match?.eventName || "");
  const [matchDate, setMatchDate] = useState(
    match?.matchDate ? moment(match.matchDate).format("yyyy-MM-DD") : ""
  );
  const [division, setDivision] = useState(match?.division || "");
  const [weightCategory, setWeightCategory] = useState(
    match?.weightCategory || ""
  );
  const [opponentName, setOpponentName] = useState(match?.opponentName || "");
  const [opponentClub, setOpponentClub] = useState(match?.opponentClub || "");
  const [opponentRank, setOpponentRank] = useState(match?.opponentRank || "");
  const [opponentGrip, setOpponentGrip] = useState(match?.opponentGrip || "");
  const [opponentCountry, setOpponentCountry] = useState(
    match?.opponentCountry || ""
  );
  const [oppAttackNotes, setOppAttackNotes] = useState(
    match?.opponentAttackNotes || ""
  );
  const [athAttackNotes, setAthAttackNotes] = useState(
    match?.athleteAttackNotes || ""
  );
  const [result, setResult] = useState(match?.result || "");
  const [score, setScore] = useState(match?.score || "");
  const [videoTitle, setVideoTitle] = useState(match?.videoTitle || "");
  const [videoURL, setVideoURL] = useState(match?.videoURL || "");
  const [isPublic, setIsPublic] = useState(match?.isPublic || false);
  const [loadedTechniques, setLoadedTechniques] = useState([]);

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

  const techniqueList = loadedTechniques.map((tech, i) => ({
    label: tech.techniqueName,
    value: i,
  }));

  const suggestions = techniqueList.map((name, i) => ({
    value: i,
    label: name,
  }));

  const [opponentSelected, setOpponentSelected] = useState(
    match?.opponentAttacks?.map((item, i) => ({ value: i, label: item })) || []
  );
  const [athleteSelected, setAthleteSelected] = useState(
    match?.athleteAttacks?.map((item, i) => ({ value: i, label: item })) || []
  );

  const onOpponentAdd = useCallback(
    (tag) => setOpponentSelected((prev) => [...prev, tag]),
    []
  );
  const onOpponentDelete = useCallback(
    (i) => setOpponentSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );
  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    []
  );
  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const rawVideoInput = formData.get("videoURL").trim();
    let embedURL = "";
    if (rawVideoInput.includes("youtu.be")) {
      const id = rawVideoInput.split("youtu.be/")[1]?.split("?")[0];
      embedURL = `https://www.youtube.com/embed/${id}`;
    } else if (rawVideoInput.includes("watch?v=")) {
      const id = rawVideoInput.split("watch?v=")[1]?.split("&")[0];
      embedURL = `https://www.youtube.com/embed/${id}`;
    } else if (rawVideoInput.includes("embed/")) {
      embedURL = rawVideoInput;
    }

    const payload = {
      matchType: formData.get("matchType"),
      eventName: formData.get("eventName"),
      matchDate: formData.get("matchDate"),
      division: formData.get("division"),
      weightCategory: formData.get("weightCategory"),
      opponentName: formData.get("opponentName"),
      opponentClub: formData.get("opponentClub"),
      opponentRank: formData.get("opponentRank"),
      opponentGrip,
      opponentCountry,
      opponentAttacks: opponentSelected.map((item) => item.label.toLowerCase()),
      opponentAttackNotes: oppAttackNotes,
      athleteAttacks: athleteSelected.map((item) => item.label.toLowerCase()),
      athleteAttackNotes: athAttackNotes,
      result: formData.get("result"),
      score: formData.get("score"),
      videoTitle: formData.get("videoTitle"),
      videoURL: embedURL,
      isPublic: formData.get("isPublic") === "on",
    };

    // Determine IDs
    const userId = athlete?.userId || athlete._id;
    const memberId = athlete?._id;

    if (userType === "family") {
      payload.familyMemberId = memberId;
    } else {
      payload.athlete = athlete._id;
      payload.createdBy = athlete._id;
      payload.createdByName = `${athlete.firstName} ${athlete.lastName}`;
    }

    const method = match ? "PATCH" : "POST";
    const base = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}`;
    const url =
      userType === "family"
        ? match
          ? `${base}/family/${memberId}/matchReports/${match._id}` // PATCH
          : `${base}/family/${memberId}/matchReports` // POST
        : match
        ? `${base}/matchReports/${match._id}` // PATCH
        : `${base}/matchReports`; // POST

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        if (onSuccess) onSuccess();
        refreshUser();
        setOpen(false);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving the match report.");
    }
  };

  const isYouTubeURL =
    videoURL.includes("youtu.be") ||
    videoURL.includes("youtube.com/watch?v=") ||
    videoURL.includes("youtube.com/embed/");

  const userStyles = athlete?.userStyles || [];
  return (
    <Card className="p-6 shadow-md">
      <CardHeader>
        <CardTitle>
          {match ? "Update Match Report" : "Add Match Report"}
        </CardTitle>
        <CardDescription>
          {match
            ? "Edit your match details."
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
            >
              <option value="">Select match type...</option>
              {userStyles?.map((style) => (
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
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              type="text"
              id="eventName"
              name="eventName"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="matchDate">Match Date</Label>
            <Input
              type="date"
              id="matchDate"
              name="matchDate"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="division">Division</Label>
            <Input
              type="text"
              id="division"
              name="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="weightCategory">Weight Category</Label>
            <Input
              type="text"
              id="weightCategory"
              name="weightCategory"
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="opponentName">Opponent's Name</Label>
            <Input
              type="text"
              id="opponentName"
              name="opponentName"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              required
            />
            {opponentName.length > 0 && opponentName.length < 2 && (
              <p className="text-sm text-red-500 mt-1">
                Name must be at least 2 characters
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="opponentClub">Opponent's Club</Label>
            <Input
              type="text"
              id="opponentClub"
              name="opponentClub"
              value={opponentClub}
              onChange={(e) => setOpponentClub(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="opponentRank">Opponent's Rank</Label>
            <Input
              type="text"
              id="opponentRank"
              name="opponentRank"
              value={opponentRank}
              onChange={(e) => setOpponentRank(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="opponentCountry">Opponent's Country</Label>
            <select
              id="opponentCountry"
              name="opponentCountry"
              value={opponentCountry}
              onChange={(e) => setOpponentCountry(e.target.value)}
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
            <Label>Opponent's Grip</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="opponentGrip"
                  value="Righty"
                  checked={opponentGrip === "Righty"}
                  onChange={(e) => setOpponentGrip(e.target.value)}
                />{" "}
                Righty
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="opponentGrip"
                  value="Lefty"
                  checked={opponentGrip === "Lefty"}
                  onChange={(e) => setOpponentGrip(e.target.value)}
                />{" "}
                Lefty
              </label>
            </div>
          </div>

          <div>
            <Label>Opponent's Techniques</Label>
            <TechniqueTagInput
              label="Opponent's Techniques"
              name="opponentAttacks"
              selected={opponentSelected}
              suggestions={techniqueList}
              onAdd={onOpponentAdd} // ✅ FIXED
              onDelete={onOpponentDelete} // ✅ FIXED
            />
          </div>

          <div>
            <Label>Opponent Attack Notes</Label>
            <Editor
              name="oppAttackNotes"
              onChange={setOppAttackNotes}
              text={oppAttackNotes}
            />
          </div>

          <div>
            <Label>Your Techniques</Label>
            <TechniqueTagInput
              label="Your Techniques"
              name="athleteAttacks"
              selected={athleteSelected}
              suggestions={techniqueList}
              onAdd={onAthleteAdd}
              onDelete={onAthleteDelete}
            />
          </div>

          <div>
            <Label>Your Attack Notes</Label>
            <Editor
              name="athAttackNotes"
              onChange={setAthAttackNotes}
              text={athAttackNotes}
            />
          </div>

          <div>
            <Label>Match Result</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="result"
                  value="Won"
                  checked={result === "Won"}
                  onChange={(e) => setResult(e.target.value)}
                />{" "}
                Won
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="result"
                  value="Lost"
                  checked={result === "Lost"}
                  onChange={(e) => setResult(e.target.value)}
                />{" "}
                Lost
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="score">Match Score</Label>
            <Input
              type="text"
              id="score"
              name="score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="videoTitle">Video Title</Label>
            <Input
              type="text"
              id="videoTitle"
              name="videoTitle"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="videoURL">YouTube Video URL</Label>
            <Input
              type="text"
              id="videoURL"
              name="videoURL"
              value={videoURL}
              onChange={(e) => setVideoURL(e.target.value)}
            />
            {!isYouTubeURL && videoURL && (
              <p className="text-sm text-red-500 mt-1">
                This does not appear to be a valid YouTube link
              </p>
            )}
            {isYouTubeURL && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Video Preview:</p>
                <div className="aspect-video w-full mt-4 rounded-lg shadow overflow-hidden">
                  <iframe
                    className="w-full h-full"
                    src={
                      videoURL.includes("embed/")
                        ? videoURL
                        : videoURL.includes("youtu.be")
                        ? `https://www.youtube.com/embed/${
                            videoURL.split("youtu.be/")[1]?.split("?")[0]
                          }`
                        : videoURL.includes("watch?v=")
                        ? `https://www.youtube.com/embed/${
                            videoURL.split("watch?v=")[1]?.split("&")[0]
                          }`
                        : ""
                    }
                    title="YouTube Video Preview"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={isPublic}
              onChange={() => setIsPublic((prev) => !prev)}
              className="mr-2"
            />
            <Label htmlFor="isPublic">Make this match report public</Label>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              {match ? "Update" : "Submit"} Report
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MatchReportForm;
