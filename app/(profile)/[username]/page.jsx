"use client";

import PersonalInfo from "@/components/shared/profile/PersonalInfo";
import StyleCard from "@/components/shared/profile/StyleCard";
import StyleInfo from "@/components/shared/profile/StyleInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import moment from "moment";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ProfilePage = () => {
  const { username } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return; // Ensure username exists before making the request

    const fetchUser = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_DOMAIN}/profile/${username}`
        );
        if (!res.ok) throw new Error("Failed to fetch user data");

        const data = await res.json();
        setUserData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]); // Re-run when `username` changes

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const profile = userData ? userData[0] : "";

  const myStyles = profile
    ? profile.userStyles
      ? profile.userStyles
      : profile.familyMemberStyles
    : "";

  const styleResults = [
    {
      name: "Brazilian Jiu Jitsu",
      Wins: 0,
      Losses: 0,
    },
    {
      name: "Judo",
      Wins: 0,
      Losses: 0,
    },
    {
      name: "Wrestling",
      Wins: 0,
      Losses: 0,
    },
  ];

  profile &&
    profile.matchReports.length > 0 &&
    profile.matchReports?.map((match) => {
      if (match.matchType === "Brazilian Jiu Jitus") {
        if (match.result === "Won") {
          styleResults[0].Wins = styleResults[0].Wins + 1;
        } else if (match.result === "Lost") {
          styleResults[0].Losses = styleResults[0].Losses + 1;
        }
      } else if (match.matchType === "Judo") {
        if (match.result === "Won") {
          styleResults[1].Wins = styleResults[1].Wins + 1;
        } else if (match.result === "Lost") {
          styleResults[1].Losses = styleResults[1].Losses + 1;
        }
      } else if (match.matchType === "Wrestling") {
        if (match.result === "Won") {
          styleResults[2].Wins = styleResults[2].Wins + 1;
        } else if (match.result === "Lost") {
          styleResults[2].Losses = styleResults[2].Losses + 1;
        }
      }
    });

  return (
    <div className="px-2 pt-4">
      <div class="grid grid-flow-col grid-rows-4 gap-4">
        <div className="flex flex-col xl:flex-row w-full gap-6 justify-center xl:justify-start items-center xl:items-start">
          {/* Left Column: Personal Info */}
          <div className="w-full xl:w-[35%] xl:max-w-[420px] flex-shrink-0">
            <div className="mx-auto w-full flex sm:justify-center">
              <PersonalInfo profile={profile} />
            </div>
          </div>

          {/* Right Column: Styles */}
          <div className="w-full">
            <StyleInfo
              styles={myStyles}
              styleResults={styleResults}
            />
          </div>
        </div>
        <div>Test Row 2</div>
      </div>
    </div>
  );
};

export default ProfilePage;
