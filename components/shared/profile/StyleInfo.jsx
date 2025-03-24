import React from "react";
import StyleCard from "./StyleCard";

const StyleInfo = ({ styles, styleResults, profile }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {styles && styles.length > 0
        ? styles.map((style) => (
            <div
              key={style._id}
              className="flex justify-center"
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
  );
};

export default StyleInfo;
