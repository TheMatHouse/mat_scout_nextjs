import React from "react";

const FeaturesPage = () => {
  return (
    <div className="grid grid-rows-[2px_1fr_2px] items-center justify-start min-h-screen p-1 pb-20  sm:p-10">
      <div className="flex flex-col gap-8 row-start-2 items-start sm:items-start text-center">
        <h1 className="w-full text-3xl text-center font-bold">FEATURES</h1>

        <div className="bg-gray-300 ">
          <h2 className="text-2xl font-bold text-ms-dark-red d-flex justify-content-center my-5">
            FOR ATHLETES
          </h2>
          <div className="grid grid-rows-3 grid-flow-col gap-4">
            <div>Col 1</div>
            <div>Col 2</div>
            <div>Col 3</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;
