import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import moment from "moment";
import Link from "next/link";
import React from "react";

const StyleCard = ({ user, style, type, styleResults }) => {
  console.log("style ", style);
  return (
    <>
      <Card className="style_card mb-3">
        <CardHeader>
          <CardTitle className="style_card_title text-center p-1">
            {style.styleName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="profile_card_text d-flex text-left">
            <strong>Rank:</strong>&nbsp;
            {style.rank}
          </div>
          <div className="profile_card_text d-flex text-left">
            <strong>Promotion Date:</strong>&nbsp;
            {moment(style.promotionDate).format("MMMM D, YYYY")}
          </div>
          <div className="profile_card_text d-flex text-left">
            <strong>Division:</strong>&nbsp;
            {style.division}
          </div>
          <div className="profile_card_text d-flex text-left">
            <strong>Weight Class:</strong>&nbsp;
            {style.weightClass}
          </div>
          <div className="profile_card_text d-flex text-left">
            <strong>Grip:</strong>&nbsp;
            {style.grip}
          </div>
          <div className="profile_card_text d-flex justify-content-start">
            <strong>Favorite Technique:</strong>&nbsp;
            {style.favoriteTechnique}
          </div>
          <div className="profile_card_text text-start">
            <strong>My Record in {style.styleName}:</strong>
            <br />
            <span className="ms-4">
              <strong className="">Wins: </strong>
              {style.styleName === "Brazilian Jiu Jitsu" &&
                `${styleResults && styleResults[0]?.Wins}`}
              {style.styleName === "Judo" &&
                `${styleResults && styleResults[1]?.Wins}`}
              {style.styleName === "Wrestling" &&
                `${styleResults && styleResults[2]?.Wins}`}
              <br />
            </span>
            <span className="ms-4">
              <strong>Losses: </strong>
              {style.styleName === "Brazilian Jiu Jitsu" &&
                `${styleResults && styleResults[0]?.Losses}`}
              {style.styleName === "Judo" &&
                `${styleResults && styleResults[1]?.Losses}`}
              {style.styleName === "Wrestling" &&
                `${styleResults && styleResults[2]?.Losses}`}
            </span>
            <br />
            <span className="ms-4">View match results - comming soon!</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default StyleCard;
