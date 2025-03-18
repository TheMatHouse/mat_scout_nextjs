"use client";
import { useState, useEffect, useCallback } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Countries from "@/assets/countries.json";

import Tooltip from "../../Tooltip";
import { CircleHelp } from "lucide-react";
import Tags from "../../Tags";
import Editor from "../../Editor";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import moment from "moment";

const MatchReportForm = ({
  athlete,
  match,
  styles,
  techniques,
  type,
  setOpen,
}) => {
  const router = useRouter();
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
    setOpponentCountry(newCountry);
  }, [newCountry]);

  const [matchType, setMatchType] = useState(
    match?.matchType ? match?.matchType : ""
  );
  const [eventName, setEventName] = useState(
    match?.eventName ? match?.eventName : ""
  );
  const [matchDate, setMatchDate] = useState(
    match?.matchDate ? moment(match.matchDate).format("yyyy-MM-DD") : ""
  );
  const [division, setDivision] = useState(
    match?.division ? match?.division : ""
  );
  const [weightCategory, setWeightCategory] = useState(
    match?.weightCategory ? match?.weightCategory : ""
  );
  const [opponentName, setOpponentName] = useState(
    match?.opponentName ? match?.opponentName : ""
  );
  const [opponentClub, setOpponentClub] = useState(
    match?.opponentClub ? match?.opponentClub : ""
  );
  const [opponentRank, setOpponentRank] = useState(
    match?.opponentRank ? match?.opponentRank : ""
  );
  // const [opponentCountry, setOpponentCountry] = useState(
  //   match?.opponentCountry
  //     ? match?.opponentCountry
  //     : newCountry
  //     ? newCountry
  //     : ""
  //);
  const [opponentCountry, setOpponentCountry] = useState(
    match?.athleteCountry || Country || ""
  );
  const [opponentGrip, setOpponentGrip] = useState(
    match?.opponentGrip ? match.opponentGrip : ""
  );

  // const [opponentAttackNotes, setOpponentAttackNotes] = useState(
  //   match?.opponentAttackNotes ? match.opponentAttackNotes : ""
  // );

  const [oppAttackNotes, setOppAttackNotes] = useState(
    match?.opponentAttackNotes ? match.opponentAttackNotes : ""
  );

  const [athAttackNotes, setAthAttackNotes] = useState(
    match?.athleteAttackNotes ? match.athleteAttackNotes : ""
  );

  const [result, setResult] = useState(match?.result ? match.result : "");
  const [score, setScore] = useState(match?.score ? match.score : "");
  const [videoTitle, setVideoTitle] = useState(
    match?.videoTitle ? match.videoTitle : ""
  );
  const [videoURL, setVideoURL] = useState(
    match?.videoURL ? match.videoURL : ""
  );
  const [isPublic, setIsPublic] = useState(
    match?.isPublic ? match.isPublic : false
  );

  const techniqueList = [];
  techniques?.map((technique) => techniqueList.push(technique.techniqueName));

  const suggestions = techniqueList.map((name, index) => ({
    value: index,
    label: name,
  }));

  // Opponent Opponent
  const oppAttacksFromDB = [];
  if (match) {
    if (match.opponentAttacks) {
      match.opponentAttacks.map((item, i) => {
        oppAttacksFromDB.push({
          value: i,
          label: item,
        });
      });
    }
  }

  const [opponentSelected, setOpponentSelected] = useState(
    oppAttacksFromDB ? oppAttacksFromDB : []
  );
  const [opponentAttacks, setOpponentAttacks] = useState([]);

  const onOpponentAdd = useCallback(
    (newTag) => {
      setOpponentSelected([...opponentSelected, newTag]);
    },
    [opponentSelected]
  );

  const onOpponentDelete = useCallback(
    (tagIndex) => {
      setOpponentSelected(opponentSelected.filter((_, i) => i !== tagIndex));
    },
    [opponentSelected]
  );

  // Athlete Attacks
  const athAttacksFromDB = [];
  if (match) {
    if (match.athleteAttacks) {
      match.athleteAttacks.map((item, i) => {
        athAttacksFromDB.push({
          value: i,
          label: item,
        });
      });
    }
  }
  const [athleteSelected, setAthleteSelected] = useState(
    athAttacksFromDB ? athAttacksFromDB : []
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const oppAttacks = [];

    if (opponentSelected) {
      opponentSelected.map((item) => {
        oppAttacks.push(item.label.toLowerCase());
      });
    }

    const athAttacks = [];
    if (athleteSelected) {
      athleteSelected.map((item) => {
        athAttacks.push(item.label.toLowerCase());
      });
    }

    const videoURLTemp = e.target.videoURL.value.split("https://");

    const newVideoURL =
      videoURLTemp.length > 1 ? "https://" + videoURLTemp[1] : "";

    try {
      if (type === "user") {
        let domain = "";
        let method = "";

        if (match) {
          method = "PATCH";
          domain = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${athlete._id}/matchReports/${match._id}`;
        } else {
          method = "POST";
          domain = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${athlete._id}/matchReports`;
        }

        const matchType = formData.get("matchType");
        const eventName = formData.get("eventName");
        const matchDate = formData.get("matchDate");
        const division = formData.get("division");
        const weightCategory = formData.get("weightCategory");
        const opponentName = formData.get("opponentName");
        const opponentClub = formData.get("opponentClub");
        const opponentRank = formData.get("opponentRank");
        const opponentGrip = formData.get("opponentGrip");
        const opponentCountry = newCountry;
        //const opponentAttacks = oppAttacks && oppAttacks;
        const opponentAttacks = oppAttacks && oppAttacks;
        const opponentAttackNotes = oppAttackNotes && oppAttackNotes;
        const athleteAttacks = athAttacks && athAttacks;
        const athleteAttackNotes = athAttackNotes && athAttackNotes;
        const result = formData.get("result");
        const score = formData.get("score");
        const videoTitle = formData.get("videoTitle");
        const videoURL = newVideoURL;
        const isPublic = formData.get("isPublic") === "on" ? true : false;
        console.log("video url ", videoURL);
        const response = await fetch(domain, {
          method,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({
            athlete: athlete._id,
            createdBy: athlete._id,
            createdByName: `${athlete.firstName} ${athlete.lastName}`,
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
            opponentAttacks,
            opponentAttackNotes,
            athleteAttacks,
            athleteAttackNotes,
            result,
            score,
            videoTitle,
            videoURL: videoURL === "https://undefined" ? "" : videoURL,
            isPublic,
          }),
        });
        const data = await response.json();

        if (response.ok) {
          const timer = setTimeout(() => {
            router.refresh();
            toast.success(data.message, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
            setOpen(false);
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          toast.error(data.message);
          console.log(data.message);
        }
      }
    } catch (error) {
      console.log(error.message);
      toast.error(error.message);
    }
  };

  return (
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Match Report</CardTitle>
          <CardDescription>
            {match?._id ? "Update this match report" : "Add a new match report"}
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
                htmlFor="eventName"
              >
                Event Name
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="eventName"
                name="eventName"
                placeholder="Event name"
                required
                defaultValue={eventName}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="matchDate"
              >
                Match Date
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="date"
                id="matchDate"
                name="matchDate"
                placeholder="Event name"
                required
                defaultValue={matchDate}
              />
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
                htmlFor="opponentName"
              >
                Opponent's Name
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="opponentName"
                name="opponentName"
                placeholder="Opponent's Name"
                required
                defaultValue={opponentName}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="opponentClub"
              >
                Opponent's Club
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="opponentClub"
                name="opponentClub"
                placeholder="Opponent's Club"
                defaultValue={opponentClub}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="opponentRank"
              >
                Opponent's Rank
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="opponentRank"
                name="opponentRank"
                placeholder="Opponent's Rank"
                defaultValue={opponentRank}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="opponentCountry"
              >
                Opponent's Country
              </label>
              <select
                id="opponentCountry"
                name="opponentCountry"
                value={opponentCountry}
                onChange={(e) => {
                  setNewCountry(e.target.value);
                  setOpponentCountry(e.target.value);
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

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="opponentGrip"
              >
                Opponent's Grip <br />
                <span className="text-xl text-muted-foreground my-2">
                  (Righty or Lefty)
                </span>
              </label>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="opponentGrip"
                  name="opponentGrip"
                  value="Righty"
                  checked={opponentGrip === "Righty"}
                  onChange={(e) => setOpponentGrip(e.target.value)}
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
                  id="opponentGrip"
                  name="opponentGrip"
                  value="Lefty"
                  checked={opponentGrip === "Lefty"}
                  onChange={(e) => setOpponentGrip(e.target.value)}
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
                htmlFor="opponentAttacks"
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
                id={opponentAttacks}
                name={opponentAttacks}
                selected={opponentSelected}
                suggestions={suggestions}
                onAdd={onOpponentAdd}
                onDelete={onOpponentDelete}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="opponentAttackNotes"
              >
                Notes on Opponent's Attacks
                <br />
              </label>
              <Editor
                name="oppAttackNotes"
                onChange={setOppAttackNotes}
                text={oppAttackNotes}
              />
              {console.log("line 616 ", oppAttackNotes)}
              {/* <Editor
                //theme="snow"
                id={opponentAttackNotes}
                name={opponentAttackNotes}
                className="quill-editor"
                onChange={setOpponentAttackNotes}
                opponentAttackNotes={opponentAttackNotes}
              /> */}
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="athleteAttacks"
              >
                {`${
                  type === "user"
                    ? "Your"
                    : type === "familyMember" &&
                      "Your Athlete's" &&
                      "Your Athlete's"
                } Techniques Used`}
              </label>
              <div className="max-w-md">
                <Tooltip
                  alt="athleteAttacks techniques used tooltip"
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
                htmlFor="opponentAttackNotes"
              >
                {`Notes on ${
                  type === "user"
                    ? "Your"
                    : type === "familyMember" &&
                      "Your Athlete's" &&
                      "Your Athlete's"
                } Attacks`}
                <br />
              </label>

              <Editor
                name="athAttackNotes"
                onChange={setAthAttackNotes}
                text={athAttackNotes}
              />
              {/* <Editor
                //theme="snow"
                id={athleteAttackNotes}
                name={athleteAttackNotes}
                className="quill-editor"
                onChange={setOpponentAttackNotes}
              /> */}
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="result"
              >
                Match Result
              </label>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="won"
                  name="result"
                  value="Won"
                  checked={result === "Won"}
                  onChange={(e) => setResult(e.target.value)}
                />
                <label
                  htmlFor="won"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Won
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="lost"
                  name="result"
                  value="Lost"
                  checked={result === "Lost"}
                  onChange={(e) => setResult(e.target.value)}
                />
                <label
                  htmlFor="lost"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Lost
                </label>
              </div>
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="score"
              >
                Match Score
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="score"
                name="score"
                placeholder="Match score"
                defaultValue={score}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="videoTitle"
              >
                Video Title
                <br />
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="videoTitle"
                name="videoTitle"
                placeholder="Video Title"
                defaultValue={videoTitle}
              />
            </div>

            <div className="my-4">
              <label
                className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
                htmlFor="videoURL"
              >
                Video URL
              </label>
              <span className="text-xl text-muted-foreground my-2">
                To share a YouTube video, locate your desired video and click
                the <strong>&quot;Share&quot;</strong> button beneath the
                player. Then click the
                <strong>
                  &quot;Embed&quot; &quot;&#x003C; &#x3e;&quot;
                </strong>{" "}
                button. When the
                <strong>&quot;Embed Video&quot;</strong> window comes up, click
                the
                <strong>&quot;Copy&quot;</strong> and paste it below. Remember,
                the video&quots URL won&quott work - you need the{" "}
                <strong>&quot;Share&quot;</strong> and
                <strong>&quot;Embed Video&quot;</strong> code..
              </span>

              <input
                className="shadow appearance-none border rounded w-full mt-4 py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="videoURL"
                name="videoURL"
                placeholder="Video URL"
                defaultValue={videoURL}
              />
            </div>

            <div className="my-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={isPublic === true}
                  onChange={() => setIsPublic((prev) => !prev)}
                />
                <label
                  htmlFor="isPublic"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Set as public
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button type="submit">
                {match ? "Update" : "Add"} Match Report
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default MatchReportForm;
