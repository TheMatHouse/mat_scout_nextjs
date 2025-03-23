import React from "react";
import StyleCard from "./StyleCard";

const StyleInfo = ({ styles, styleResults, profile }) => {
  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {styles && styles.length > 0
        ? styles.map((style) => (
            <div key={style._id}>
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
