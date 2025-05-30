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
import Tooltip from "../../shared/Tooltip";
import Tags from "../../shared/Tags";
import Editor from "../../shared/Editor";

// Icons
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
const ScoutingReportForm = ({
  athlete,
  report,
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
    setAthleteCountry(newCountry);
  }, [newCountry]);

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

  const [videos, setVideos] = useState(
    report?.videos?.length > 0
      ? report.videos.map((video) => ({
          id: video._id,
          title: video.videoTitle || "",
          url: video.videoURL || "",
          notes: video.videoNotes || "",
        }))
      : []
  );

  const addVideoFields = () => {
    setVideos([...videos, { id: Date.now(), title: "", url: "", notes: "" }]);
  };

  const updateVideoField = (index, field, value) => {
    setVideos((prevVideos) =>
      prevVideos.map((video, i) =>
        i === index ? { ...video, [field]: value } : video
      )
    );
  };

  const removeVideo = (index) => {
    setVideos((prevVideos) => prevVideos.filter((_, i) => i !== index));
  };

  const deleteVideoHandler = async (videoTitle, videoId, index) => {
    if (
      window.confirm(
        `Are you sure you want to delete the video, ${videoTitle}?`
      )
    ) {
      // Check if the video exists in the report before attempting to delete
      const videoExistsInReport = report.videos?.some(
        (video) => video._id === videoId
      );

      // Remove the video from the local state first
      removeVideo(index);

      if (!videoExistsInReport) {
        // If the video does not exist in the DB, just return success without making a request
        toast.success(`Video "${videoTitle}" removed locally.`);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${athlete._id}/scoutingReports/${report._id}/videos/${videoId}`,
          {
            method: "DELETE",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Content-type": "application/json; charset=UTF-8",
            },
          }
        );

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
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          toast.error(data.message);
          console.log(data.message);
        }
      } catch (err) {
        toast.error(err?.data?.error || err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const athAttacks = [];

    if (athleteSelected) {
      athleteSelected.map((item) => {
        athAttacks.push(item.label.toLowerCase());
      });
    }

    const myVideos = [];
    videos &&
      videos.map((video) => {
        myVideos.push({
          videoTitle: video.title,
          videoURL: video.url,
          videoNotes: video.notes,
        });
      });

    const bodyData = {
      athlete: athlete._id,
      type,
      reportForAthleteFirstName: athlete?.firstName,
      athleteEmail: athlete?.email,
      createdBy: athlete._id,
      createdByName: `${athlete.firstName} ${athlete.lastName}`,
      matchType: formData.get("matchType"),
      division: formData.get("division"),
      weightCategory: formData.get("weightCategory"),
      athleteFirstName: formData.get("athleteFirstName"),
      athleteLastName: formData.get("athleteLastName"),
      athleteNationalRank: formData.get("athleteNationalRank"),
      athleteWorldRank: formData.get("athleteWorldRank"),
      athleteClub: formData.get("athleteClub"),
      athleteRank: formData.get("athleteRank"),
      athleteGrip: formData.get("athleteGrip"),
      athleteCountry: formData.get("athleteCountry"),
      athleteAttacks: athAttacks && athAttacks,
      athleteAttackNotes: athleteAttackNotes && athleteAttackNotes,
      videos: myVideos,
      ...(typeof teamId !== "undefined" && teamId ? { teamId } : {}),
    };

    let domain = "";
    let method = "";
    if (report) {
      method = "PATCH";
      domain = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${athlete._id}/scoutingReports/${report._id}`;
    } else {
      method = "POST";
      domain = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${athlete._id}/scoutingReports`;
    }
    const response = await fetch(domain, {
      method,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(bodyData),
    });

    const data = await response.text();

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
                  styles?.map((style) => (
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
                htmlFor="athleteAttacks"
              >
                Athlete's Techniques Used
              </label>
              <div className="max-w-md">
                <Tooltip
                  alt="Athlete techniques used tooltip"
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
                name="athleteAttackNotes"
                onChange={setAthleteAttackNotes}
                text={athleteAttackNotes}
              />
            </div>

            <div className="my-4">
              <h2 className="text-lg font-bold">Videos</h2>

              {/* Video Fields */}
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="mb-6 p-4 border rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800"
                >
                  {/* Video Title Input */}
                  <label className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2">
                    Video Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter video title"
                    value={video.title}
                    onChange={(e) =>
                      updateVideoField(index, "title", e.target.value)
                    }
                    className="w-full p-2 border rounded-md text-gray-900 dark:text-gray-100"
                  />

                  {/* If adding a new video, show the URL input */}
                  {report?.videos?.length > index ? (
                    // Show embedded video when editing
                    <div
                      className="py-2 w-full"
                      dangerouslySetInnerHTML={{ __html: video.url }}
                    />
                  ) : (
                    // Show video URL input when adding
                    <>
                      <label className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2">
                        Video URL
                      </label>
                      <input
                        type="text"
                        placeholder="Enter video URL"
                        value={video.url}
                        onChange={(e) =>
                          updateVideoField(index, "url", e.target.value)
                        }
                        className="w-full p-2 border rounded-md text-gray-900 dark:text-gray-100"
                      />
                    </>
                  )}

                  {/* Video Notes Editor */}
                  <label className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2">
                    Video Notes
                  </label>
                  <Editor
                    name={`videoNotes-${index}`}
                    text={video.notes}
                    onChange={(value) =>
                      updateVideoField(index, "notes", value)
                    }
                  />

                  {/* Remove Video Button */}
                  <Button
                    type="button"
                    onClick={() =>
                      deleteVideoHandler(video.title, video.id, index)
                    }
                    className="mt-3 bg-red-500 text-white"
                  >
                    Remove Video
                  </Button>
                </div>
              ))}

              {/* Add Video Button */}
              <Button
                type="button"
                onClick={addVideoFields}
                className="my-3"
              >
                {videos.length > 0 ? "Add Another Video" : "Add Video"}
              </Button>
            </div>

            <div className="flex justify-center mt-5 pt-5">
              <Button type="submit">
                {report ? "Update" : "Add"} Scouting Report
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default ScoutingReportForm;
