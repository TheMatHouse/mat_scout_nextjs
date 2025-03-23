"use client";

import StyleCard from "@/components/shared/profile/StyleCard";
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
  console.log("PROFILE ", profile);
  console.log("MY STYLES ", myStyles);
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
  console.log(profile.avatar);
  console.log(profile);
  return (
    <div>
      <h1>Profile of {username}</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-sm-12 col-md-9">
          <Card className="w-[350px]">
            <CardContent>
              <div className="flex flex-col items-center text-center gap-4 mt-2">
                {/* Profile Image */}
                <div
                  className="w-24 h-24 rounded-full bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${profile?.avatar})`,
                  }}
                ></div>

                {/* Profile Details */}
                <div className="flex flex-col items-center">
                  <h2 className="text-xl font-semibold">{`${profile?.firstName} ${profile?.lastName}`}</h2>

                  {profile.city && (
                    <div className="text-sm mt-2">
                      {profile.city}
                      {profile.state && `, ${profile.state}`}
                      {profile.country && (
                        <>
                          <br />
                          {profile.country}
                        </>
                      )}
                    </div>
                  )}

                  <span className="border border-t-ms-light-gray dark:border-t-ms-blue my-2 w-full"></span>

                  {profile?.gender && (
                    <p className="text-sm">
                      <strong>Gender: </strong>
                      {profile?.gender}
                    </p>
                  )}

                  <span className="border border-t-ms-light-gray dark:border-t-ms-blue my-2 w-full"></span>

                  {profile?.teams?.length ? (
                    <h3 className="text-lg font-semibold">My Teams</h3>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Join Team - coming soon
                    </p>
                  )}
                  <span className="border border-t-ms-light-gray dark:border-t-ms-blue my-2 w-full"></span>
                  <h3 className="mt-2">Family Members - coming soon</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-md-6">
          {console.log(myStyles)}
          {myStyles && myStyles.length > 0
            ? myStyles.map((style) => (
                <div
                  lg={12}
                  xl={6}
                  key={style._id}
                >
                  <StyleCard
                    style={style}
                    user={profile}
                    styleResults={styleResults}
                  />
                </div>
              ))
            : "no sytles"}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
