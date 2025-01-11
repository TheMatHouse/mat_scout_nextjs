"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "react-toastify";

const AddStyle = ({ user, userType, type, handleClose }) => {
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);

      const styleName = formData.get("styleName");
      const rank = formData.get("rank");
      const promotionDate = formData.get("promotionDate");
      const division = formData.get("division");
      const weightClass = formData.get("weightClass");
      const grip = formData.get("grip");
      const favoriteTechnique = formData.get("favoriteTechnique");

      if (userType === "user") {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyle`,
          {
            method: "POST",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
              styleName,
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
      }
    } catch (error) {
      const data = await error.json();
      toast.error("Unable to update style ", data.message);
    }
  };
  return (
    <div className="w-full max-w-lg shadow-md">
      <h1 className="text-3xl text-center">Add a Style/Sport</h1>
      <form
        onSubmit={handleSubmit}
        className="rounded px-8 pt-6 pb-8 mb-4"
      >
        <div className="my-4">
          <label
            className="block text-gray-900 dark:text-gray-100 text-xl font-bold mb-1 md:mb-0 p-2"
            htmlFor="styleName"
          >
            Style/Sport
          </label>

          <select
            id="styleName"
            name="styleName"
            required
          >
            <option value="">Select Style/Sport...</option>
            <option value="Brazilian Jiu Jitsu">Brazilian Jiu Jitsu</option>
            <option value="Judo">Judo</option>
            <option value="Wrestling">Wrestling</option>
          </select>
          <br />
          <div className="text-sm mt-2">
            Don&apos;t see your sport listed?{" "}
            <Link href="/contact">Click here to request a new style/sport</Link>
          </div>
        </div>

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

export default AddStyle;
