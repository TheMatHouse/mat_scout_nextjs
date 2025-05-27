"use client";
import Spinner from "@/components/shared/Spinner";

const override = {
  display: "block",
  margin: "100px auto",
};
const LoadingPage = () => {
  return (
    <Spinner
      color="#d90429"
      cssOverride={override}
      size={150}
      aria-label="Loading Spinner"
    />
  );
};

export default LoadingPage;
