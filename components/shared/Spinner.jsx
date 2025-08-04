import React from "react";

const Spinner = ({ size = 48, color = "var(--ms-dark-red)" }) => {
  return (
    <div
      className="flex justify-center items-center"
      style={{ minHeight: "200px" }} // Optional: ensure space
    >
      <div
        className="animate-spin rounded-full border-4 border-solid border-e-transparent"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderColor: color,
          borderRightColor: "transparent",
        }}
      />
    </div>
  );
};

export default Spinner;
