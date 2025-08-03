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
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "../../shared/Editor";
import TechniqueTagInput from "../../shared/TechniqueTagInput";

// ✅ Shared Form Components
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

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

  // Form State
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

        if (Array.isArray(data)) {
          setLoadedTechniques(data);
        } else {
          console.warn("Expected array but got:", data);
          setLoadedTechniques([]);
        }
      } catch (error) {
        console.error("Error fetching techniques:", error);
        setLoadedTechniques([]);
      }
    };

    fetchTechniques();
  }, []);

  const techniqueList = loadedTechniques.map((tech, i) => ({
    label: tech.name,
    value: i,
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
      matchType,
      eventName,
      matchDate,
      division,
      weightCategory,
      opponentName,
      opponentClub,
      opponentRank,
      opponentGrip,
      opponentCountry,
      opponentAttacks: opponentSelected.map((item) => item.label.toLowerCase()),
      opponentAttackNotes: oppAttackNotes,
      athleteAttacks: athleteSelected.map((item) => item.label.toLowerCase()),
      athleteAttackNotes: athAttackNotes,
      result,
      score,
      videoTitle,
      videoURL: embedURL,
      isPublic,
    };

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
          ? `${base}/family/${memberId}/matchReports/${match._id}`
          : `${base}/family/${memberId}/matchReports`
        : match
        ? `${base}/matchReports/${match._id}`
        : `${base}/matchReports`;

    try {
      console.log("Payload being sent:", payload);
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
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Match Type */}
      <FormSelect
        label="Match Type"
        placeholder="Select match type..."
        value={matchType}
        onChange={setMatchType}
        options={userStyles.map((style) => ({
          value: style.styleName,
          label: style.styleName,
        }))}
      />

      <FormField
        label="Event Name"
        name="eventName"
        type="text"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        required
      />

      <FormField
        label="Match Date"
        name="matchDate"
        type="date"
        value={matchDate}
        onChange={(e) => setMatchDate(e.target.value)}
        required
      />

      <FormField
        label="Division"
        name="division"
        type="text"
        value={division}
        onChange={(e) => setDivision(e.target.value)}
      />

      <FormField
        label="Weight Category"
        name="weightCategory"
        type="text"
        value={weightCategory}
        onChange={(e) => setWeightCategory(e.target.value)}
      />

      <FormField
        label="Opponent's Name"
        name="opponentName"
        type="text"
        value={opponentName}
        onChange={(e) => setOpponentName(e.target.value)}
        required
      />

      <FormField
        label="Opponent's Club"
        name="opponentClub"
        type="text"
        value={opponentClub}
        onChange={(e) => setOpponentClub(e.target.value)}
      />

      <FormField
        label="Opponent's Rank"
        name="opponentRank"
        type="text"
        value={opponentRank}
        onChange={(e) => setOpponentRank(e.target.value)}
      />

      {/* Country */}
      <FormSelect
        label="Opponent's Country"
        placeholder="Select country..."
        value={opponentCountry}
        onChange={setOpponentCountry}
        options={Countries.map((country) => ({
          value: country.code3,
          label: country.name,
        }))}
      />

      {/* Grip */}
      <div>
        <label className="block mb-1 font-medium">Opponent's Grip</label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="opponentGrip"
              value="Righty"
              checked={opponentGrip === "Righty"}
              onChange={(e) => setOpponentGrip(e.target.value)}
            />
            Righty
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="opponentGrip"
              value="Lefty"
              checked={opponentGrip === "Lefty"}
              onChange={(e) => setOpponentGrip(e.target.value)}
            />
            Lefty
          </label>
        </div>
      </div>

      {/* Techniques & Notes */}
      <TechniqueTagInput
        label="Opponent's Techniques"
        name="opponentAttacks"
        selected={opponentSelected}
        suggestions={techniqueList}
        onAdd={onOpponentAdd}
        onDelete={onOpponentDelete}
      />

      <Editor
        name="oppAttackNotes"
        onChange={setOppAttackNotes}
        text={oppAttackNotes}
        label="Opponent's Attack Notes"
      />

      <TechniqueTagInput
        label="Your Techniques"
        name="athleteAttacks"
        selected={athleteSelected}
        suggestions={techniqueList}
        onAdd={onAthleteAdd}
        onDelete={onAthleteDelete}
      />

      <Editor
        name="athAttackNotes"
        onChange={setAthAttackNotes}
        text={athAttackNotes}
        label="My Attack Notes"
      />

      {/* Result */}
      <div>
        <label className="block mb-1 font-medium">Match Result</label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="result"
              value="Won"
              checked={result === "Won"}
              onChange={(e) => setResult(e.target.value)}
            />
            Won
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="result"
              value="Lost"
              checked={result === "Lost"}
              onChange={(e) => setResult(e.target.value)}
            />
            Lost
          </label>
        </div>
      </div>

      <FormField
        label="Match Score"
        name="score"
        type="text"
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />

      <FormField
        label="Video Title"
        name="videoTitle"
        type="text"
        value={videoTitle}
        onChange={(e) => setVideoTitle(e.target.value)}
      />

      <FormField
        label="YouTube Video URL"
        name="videoURL"
        type="text"
        value={videoURL}
        onChange={(e) => setVideoURL(e.target.value)}
      />

      {/* Video Preview */}
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

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublic"
          name="isPublic"
          checked={isPublic}
          onChange={() => setIsPublic((prev) => !prev)}
          className="mr-2"
        />
        <label htmlFor="isPublic">Make this match report public</label>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          className="btn btn-primary"
        >
          {match ? "Update" : "Submit"} Report
        </Button>
      </div>
    </form>
  );
};

export default MatchReportForm;
