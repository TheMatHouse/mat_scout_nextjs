import { Card, CardContent } from "@/components/ui/card";
import React from "react";

const PersonalInfo = ({ profile }) => {
  return (
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
              <p className="text-sm text-gray-500">Join Team - coming soon</p>
            )}
            <span className="border border-t-ms-light-gray dark:border-t-ms-blue my-2 w-full"></span>
            <h3 className="mt-2">Family Members - coming soon</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalInfo;
