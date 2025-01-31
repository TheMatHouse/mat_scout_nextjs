"use client";
import React, { useState } from "react";
import Link from "next/link";
import moment from "moment";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const EditStyle = ({ user, style, userType, handleClose }) => {
  const router = useRouter();

  const [rank, setRank] = useState(style?.rank ? style.rank : "");
  const [promotionDate, setPromotionDate] = useState(
    style?.promotionDate ? moment(style.promotionDate).format("yyyy-MM-DD") : ""
  );
  const [weightClass, setWeightClass] = useState(
    style?.weightClass ? style.weightClass : ""
  );
  const [division, setDivision] = useState(
    style?.division ? style.division : ""
  );
  const [grip, setGrip] = useState(style?.grip ? style.grip : "");
  const [favoriteTechnique, setFavoriteTechnique] = useState(
    style?.favoriteTechnique ? style.favoriteTechnique : ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyle/${style._id}`,
        {
          method: "PATCH",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({
            rank,
            promotionDate,
            division,
            weightClass,
            grip,
            favoriteTechnique,
          }),
        }
      );
      if (response.status === 200) {
        const data = await response.json();
        const timer = setTimeout(() => {
          router.refresh();
          handleClose();
          toast.success(data.message);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      const data = await error.json();
      toast.error("Unable to update this style ", data.message);
    }
  };
  return (
    <div className="w-full max-w-lg shadow-md">
      <h1 className="text-3xl text-center">Edit ${style.styleName}</h1>
      <form
        onSubmit={handleSubmit}
        className="rounded px-8 pt-6 pb-8 mb-4"
      >
        <div className="my-4">
          <label
            className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
            htmlFor="rank"
          >
            {`${
              userType === "familyMember" ? user.firstName + "'s" : "My"
            }  rank`}
          </label>

          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
            type="text"
            id="rank"
            name="rank"
            placeholder="Enter Rank"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
          />
        </div>

        <div className="my-4">
          <label
            className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
            htmlFor="promotionDate"
          >
            {`${
              userType === "familyMember" ? user.firstName + "'s" : "My"
            }  promotion date`}
          </label>

          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
            type="date"
            id="promotionDate"
            name="promotionDate"
            placeholder="Enter promotion date"
            defaultValue={promotionDate}
            onChange={(e) => setPromotionDate(e.target.value)}
          />
        </div>

        <div className="my-4">
          <label
            className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
            htmlFor="division"
          >
            {`${
              userType === "familyMember" ? user.firstName + "'s" : "My"
            }  division`}
          </label>

          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
            type="text"
            id="division"
            name="division"
            placeholder="Enter division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          />
        </div>

        <div className="my-4">
          <label
            className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
            htmlFor="weightClass"
          >
            {`${
              userType === "familyMember" ? user.firstName + "'s" : "My"
            }  weightClass`}
          </label>

          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
            type="text"
            id="weightClass"
            name="weightClass"
            placeholder="Enter weight class"
            value={weightClass}
            onChange={(e) => setWeightClass(e.target.value)}
          />
        </div>

        <div className="my-4">
          <legend className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2">
            {`${
              userType === "familyMember" ? user.firstName + "'s" : "My"
            }  grip`}{" "}
            (Lefty or Righty)
          </legend>

          <div className="flex items-center">
            <input
              type="radio"
              id="righty"
              name="grip"
              value="Righty"
              checked={grip === "Righty"}
              onChange={(e) => setGrip(e.target.value)}
            />
            <label
              htmlFor="righty"
              className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
            >
              Righty
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="lefty"
              name="grip"
              value="Lefty"
              checked={grip === "Lefty"}
              onChange={(e) => setGrip(e.target.value)}
            />
            <label
              htmlFor="lefty"
              className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
            >
              Lefty
            </label>
          </div>
        </div>

        <div className="my-4">
          <label
            className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
            htmlFor="favoriteTechnique"
          >
            {`${
              userType === "familyMember" ? user.firstName + "'s" : "My"
            }  favorite technique`}
          </label>

          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
            type="text"
            id="favoriteTechnique"
            name="favoriteTechnique"
            placeholder="Enter favorite technique"
            value={favoriteTechnique}
            onChange={(e) => setFavoriteTechnique(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-center">
          <button
            className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
            type="submit"
          >
            Add Style/Sport
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStyle;
