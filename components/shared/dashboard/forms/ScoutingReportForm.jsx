"use client";
import { useEffect, useState, useCallback, useRef } from "react";

import Countries from "@/assets/countries.json";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Tooltip from "../../Tooltip";
import Tags from "../../Tags";
import Editor from "../../Editor";

// Icons
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
const ScoutingReportForm = ({
  athlete,
  report,
  styles,
  techniques,
  type,
  setOpen,
}) => {
  const [add, setAdd] = useState("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setAdd(data.address));
    });
  }, []);

  const myCountry_code = add?.country_code;

  const myCountry = Countries.find(
    (country) => country.code2.toLowerCase() === myCountry_code
  );

  const Country = myCountry?.code3 || ""; // Ensure default is an empty string

  const [newCountry, setNewCountry] = useState(Country);

  // Update newCountry when Country changes
  useEffect(() => {
    setNewCountry(Country);
  }, [Country]);

  // Ensure athleteCountry updates when newCountry changes
  useEffect(() => {
    setAthleteCountry(newCountry);
  }, [newCountry]);

  console.log(newCountry);
  const [matchType, setMatchType] = useState(
    report?.matchType ? report?.matchType : ""
  );
  const [division, setDivision] = useState(
    report?.division ? report?.division : ""
  );
  const [weightCategory, setWeightCategory] = useState(
    report?.weightCategory ? report?.weightCategory : ""
  );
  const [athleteNationalRank, setAthleteNationalRank] = useState(
    report?.athleteNationalRank ? report?.athleteNationalRank : ""
  );
  const [athleteWorldRank, setAthleteWorldRank] = useState(
    report?.athleteWorldRank ? report?.athleteWorldRank : ""
  );
  const [athleteFirstName, setAthleteFirstName] = useState(
    report?.athleteFirstName ? report?.athleteFirstName : ""
  );
  const [athleteLastName, setAthleteLastName] = useState(
    report?.athleteLastName ? report?.athleteLastName : ""
  );
  const [athleteClub, setAthleteClub] = useState(
    report?.athleteClub ? report?.athleteClub : ""
  );
  const [athleteRank, setAthleteRank] = useState(
    report?.athleteRank ? report?.athleteRank : ""
  );
  const [athleteCountry, setAthleteCountry] = useState(
    report?.athleteCountry || Country || ""
  );
  const [athleteGrip, setAthleteGrip] = useState(
    report?.opponentGrip ? report.opponentGrip : ""
  );

  const [athleteAttackNotes, setAthleteAttackNotes] = useState(
    report?.athleteAttackNotes ? report.athleteAttackNotes : ""
  );

  const [videoTitle, setVideoTitle] = useState(
    report?.videoTitle ? report.videoTitle : ""
  );
  const [videoURL, setVideoURL] = useState(
    report?.videoURL ? report.videoURL : ""
  );
  const [isPublic, setIsPublic] = useState(
    report?.isPublic ? report.isPublic : false
  );

  const techniqueList = [];
  techniques?.map((technique) => techniqueList.push(technique.techniqueName));

  const suggestions = techniqueList.map((name, index) => ({
    value: index,
    label: name,
  }));

  // Opponent Opponent
  const athleteAttacksFromDB = [];
  if (report) {
    if (report.athleteAttacks) {
      report.athleteAttacks.map((item, i) => {
        athleteAttacksFromDB.push({
          value: i,
          label: item,
        });
      });
    }
  }

  const [athleteSelected, setAthleteSelected] = useState(
    athleteAttacksFromDB ? athleteAttacksFromDB : []
  );
  const [athleteAttacks, setAthleteAttacks] = useState([]);

  const onAthleteAdd = useCallback(
    (newTag) => {
      setAthleteSelected([...athleteSelected, newTag]);
    },
    [athleteSelected]
  );

  const onAthleteDelete = useCallback(
    (tagIndex) => {
      setAthleteSelected(athleteSelected.filter((_, i) => i !== tagIndex));
    },
    [athleteSelected]
  );

  const windowSize = useRef([window.innerWidth, window.innerHeight]);
  const tooltipWidth = windowSize.current[0] > 500 ? "50vw" : "90vw";

  const [videos, setVideos] = useState([]); // Manage video fields dynamically

  const addVideoFields = () => {
    setVideos([
      ...videos,
      { id: videos.length + 1, title: "", url: "", notes: "" },
    ]);
  };

  const updateVideoField = (index, field, value) => {
    const updatedVideos = [...videos];
    updatedVideos[index][field] = value;
    setVideos(updatedVideos);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const athAttacks = [];

    if (athleteSelected) {
      athleteSelected.map((item) => {
        athAttacks.push(item.label.toLowerCase());
      });
    }

    const matchType = formData.get("matchType");
    const division = formData.get("division");
    const weightCategory = formData.get("weightCategory");
    const athleteFirstName = formData.get("athleteFirstName");
    const athleteLastName = formData.get("athleteLastName");
    const athleteNationalRank = formData.get("athleteNationalRank");
    const athleteWorldRank = formData.get("athleteWorldRank");
    const athleteClub = formData.get("athleteClub");
    const athleteRank = formData.get("athleteRank");
    const athleteGrip = formData.get("athleteGrip");
    const athleteCountry = formData.get("athleteCountry");
    const athleteAttacks = formData.get("athleteAttacks");
    const athleteAttackNotes = formData.get("athleteAttackNotes");
  };

  return (
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Scouting Report</CardTitle>
          <CardDescription>
            {report?._id
              ? "Update this scouting report"
              : "Add a new scouting report."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="rounded px-8 pb-2 mb-4"
          >
            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="matcyType"
              >
                Match Type
              </label>
              <select
                id="matchType"
                name="matchType"
                aria-label="Match Type"
                required
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
              >
                <option value="">Select Match Type...</option>
                {styles &&
                  styles.map((style) => (
                    <option
                      key={style._id}
                      value={style.styleName}
                    >
                      {style.styleName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="division"
              >
                Division
                <br />
                <span className="text-xl text-muted-foreground my-2">
                  (Jr Boyx, Senior Women, etc)
                </span>
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="division"
                name="division"
                placeholder="Division"
                defaultValue={division}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="weightCategory"
              >
                Weight Category
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="weightCategory"
                name="weightCategory"
                placeholder="Weight Category"
                defaultValue={weightCategory}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteNationalRank"
              >
                Athlete's National Rank
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="athleteNationalRank"
                name="athleteNationalRank"
                placeholder="Athlete's National Rank"
                defaultValue={athleteNationalRank}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteNationalRank"
              >
                Athlete's World Rank
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="athleteWorldRank"
                name="athleteWorldRank"
                placeholder="Athlete's World Rank"
                defaultValue={athleteWorldRank}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteFirstName"
              >
                Athlete's First Name
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="athleteFirstName"
                name="athleteFirstName"
                placeholder="Athlete's First Name"
                required
                defaultValue={athleteFirstName}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteFirstName"
              >
                Athlete's Last Name
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="athleteLastName"
                name="athleteLastName"
                placeholder="Athlete's Last Name"
                required
                defaultValue={athleteLastName}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteClub"
              >
                Athlete's Club
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="athleteClub"
                name="athleteClub"
                placeholder="Athlete's Club"
                defaultValue={athleteClub}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteRank"
              >
                Athlete's Rank (belt)
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="athleteRank"
                name="athleteRank"
                placeholder="Athlete's Rank"
                defaultValue={athleteRank}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteGrip"
              >
                Athlete's Grip <br />
                <span className="text-xl text-muted-foreground my-2">
                  (Righty or Lefty)
                </span>
              </label>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="athleteGrip"
                  name="athleteGrip"
                  value="Righty"
                  checked={athleteGrip === "Righty"}
                  onChange={(e) => setAthleteGrip(e.target.value)}
                />
                <label
                  htmlFor="righty"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Righty
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="athleteGrip"
                  name="athleteGrip"
                  value="Lefty"
                  checked={athleteGrip === "Lefty"}
                  onChange={(e) => setAthleteGrip(e.target.value)}
                />
                <label
                  htmlFor="lefty"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Lefty
                </label>
              </div>
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="opponentRank"
              >
                Opponent's Techniques Used
              </label>
              <div className="max-w-md">
                <Tooltip
                  alt="Opponent techniques used tooltip"
                  text={`Click inside the box below. A list of techniques already
                            in our database will appear. Click on a technique to
                            selected it. The selected techniques will appear above the
                            box.
                            <br /><br />
                            If a technique is not in the database, you can add your
                            technique by typing it in and then clicking on "Add" next
                            to your technique. If you added a technique by mistake,
                            you can click on the technique name above the box and it
                            will removed`}
                >
                  <CircleHelp />
                </Tooltip>
              </div>
              <Tags
                labelText="Select techniques"
                name={athleteAttacks}
                selected={athleteSelected}
                suggestions={suggestions}
                onAdd={onAthleteAdd}
                onDelete={onAthleteDelete}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="AthleteAttackNotes"
              >
                Notes on Athletes's Attacks
                <br />
              </label>
              <Editor
                name="oppAttackNotes"
                onChange={setAthleteAttackNotes}
                attackNotes={athleteAttackNotes}
              />
            </div>

            <div id="video-container">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="p-4 border-b"
                >
                  <label className="block text-gray-900 font-bold">
                    Video Title
                  </label>
                  <span className="text-xl text-muted-foreground my-2">
                    To share a YouTube video, locate your desired video and
                    click the <strong>&quot;Share&quot;</strong> button beneath
                    the player. Then click the
                    <strong>
                      &quot;Embed&quot; &quot;&#x003C; &#x3e;&quot;
                    </strong>{" "}
                    button. When the
                    <strong>&quot;Embed Video&quot;</strong> window comes up,
                    click the
                    <strong>&quot;Copy&quot;</strong> and paste it below.
                    Remember, the video&quots URL won&quott work - you need the{" "}
                    <strong>&quot;Share&quot;</strong> and
                    <strong>&quot;Embed Video&quot;</strong> code..
                  </span>
                  <input
                    type="text"
                    name={`videoTitle${video.id}`}
                    placeholder="Enter Video Title"
                    value={video.title}
                    onChange={(e) =>
                      updateVideoField(index, "title", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  />

                  <label className="block text-gray-900 font-bold mt-2">
                    Video URL
                  </label>
                  <input
                    type="text"
                    name={`videoURL${video.id}`}
                    placeholder="Enter Video URL"
                    value={video.url}
                    onChange={(e) =>
                      updateVideoField(index, "url", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  />

                  <label className="block text-gray-900 font-bold mt-2">
                    Video Notes
                  </label>
                  <Editor
                    name={`videoNotes${video.id}`}
                    onChange={(value) =>
                      updateVideoField(index, "notes", value)
                    }
                    attackNotes={video.notes} // Assuming Editor uses this prop
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={addVideoFields}
              className="add_video_btn my-3"
            >
              Add {videos.length > 0 ? "another video" : " a video"}
            </Button>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteCountry"
              >
                Athlete's Country
              </label>
              <select
                id="athleteCountry"
                name="athleteCountry"
                value={athleteCountry}
                onChange={(e) => {
                  setNewCountry(e.target.value);
                  setAthleteCountry(e.target.value);
                }}
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

            <Button type="submit">
              {report ? "Update" : "Add"} Scouting Report
            </Button>
          </form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default ScoutingReportForm;
