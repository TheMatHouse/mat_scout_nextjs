import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import moment from "moment";
import Link from "next/link";
import React from "react";

const StyleCard = ({ user, style, type, styleResults }) => {
  return (
    <Card
      key={style._id}
      className="w-full max-w-[400px] mx-auto border border-gray-400"
    >
      <CardHeader className="flex justify-center bg-ms-blue-gray p-4 h-10">
        <CardTitle className="style_card_title text-center p-1">
          {style.styleName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col my-2">
          <div className="text-md flex justify-start mb-1">
            <strong>Rank:</strong>&nbsp;{style.rank}
          </div>
          <div className="text-md flex justify-start mb-1">
            <strong>Promotion Date:</strong>&nbsp;
            {moment(style.promotionDate).format("MMMM D, YYYY")}
          </div>
          <div className="text-md flex justify-start mb-1">
            <strong>Division:</strong>&nbsp;{style.division}
          </div>
          <div className="text-md flex justify-start mb-1">
            <strong>Weight Class:</strong>&nbsp;{style.weightClass}
          </div>
          <div className="text-md flex justify-start mb-1">
            <strong>Grip:</strong>&nbsp;{style.grip}
          </div>
          <div className="text-md flex justify-start mb-1">
            <strong>Favorite Technique:</strong>&nbsp;
            {style.favoriteTechnique}
          </div>
          <div className="text-md flex justify-start mb-1">
            <strong>My Record in {style.styleName}:</strong>
            <br />
            <span className="ms-4">
              <strong>Wins: </strong>
              {style.styleName === "Brazilian Jiu Jitsu" &&
                `${styleResults?.[0]?.Wins}`}
              {style.styleName === "Judo" && `${styleResults?.[1]?.Wins}`}
              {style.styleName === "Wrestling" && `${styleResults?.[2]?.Wins}`}
              <br />
            </span>
            <span className="ms-4">
              <strong>Losses: </strong>
              {style.styleName === "Brazilian Jiu Jitsu" &&
                `${styleResults?.[0]?.Losses}`}
              {style.styleName === "Judo" && `${styleResults?.[1]?.Losses}`}
              {style.styleName === "Wrestling" &&
                `${styleResults?.[2]?.Losses}`}
            </span>
          </div>
          <div className="mt-3">
            <span className="ms-4">
              <Link href={`${user?.username}/matches`}>
                View my {style.styleName} matches{" "}
              </Link>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StyleCard;
