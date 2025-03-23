"use client";

import PersonalInfo from "@/components/shared/profile/PersonalInfo";
import StyleCard from "@/components/shared/profile/StyleCard";
import StyleInfo from "@/components/shared/profile/StyleInfo";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="px-2 pt-4 ">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="sm:order-1 md:col-span-1 mx-auto">
          <PersonalInfo profile={profile} />
        </div>
        <div className="sm:order-2 md:col-span-3 mx-auto">
          <StyleInfo
            styles={myStyles}
            profile={profile}
            styleResults={styleResults}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
