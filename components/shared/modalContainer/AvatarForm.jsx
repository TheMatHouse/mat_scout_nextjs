"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "react-toastify";

const AvatarForm = ({ user, userType, handleClose }) => {
  const router = useRouter();
  const [image, setImage] = useState([]);

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (
      file.type !== "image/jpeg" &&
      file.type !== "image/jpg" &&
      file.type !== "image/png" &&
      file.type !== "image/webp" &&
      file.type !== "image/gif"
    ) {
      toast.error("Image must be of type jpeg, jpg, png, gif, or webp");
      return;
    } else if (file.size > 1024 * 1024 * 4) {
      toast.error(`${file.name} is too large, max 5mb allowed.`);
      return;
    }

    if (file === null) return;

    setFileToBase(file);
  };

  const setFileToBase = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (userType === "user") {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/avatar`,
          {
            method: "PATCH",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
              userId: user.userId,
              avatarType: "uploaded",
              image: image,
            }),
          }
        );
        if (response.status === 200) {
          const data = await response.json();
          router.refresh();
          handleClose();
          toast.success(data.message);
        } else {
          toast.error(data.message);
        }
      } else if (userType === "familyMember") {
        // add family member upload here
      }
    } catch (error) {
      toast.error("Unable to upload avatar ", error.message);
    }
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded px-8 pt-6 pb-2 mb-4"
    >
      <div className="md:flex md:items-center mb-6">
        <div className="md:w-1/3">
          <label
            className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
            htmlFor="avatar"
          >
            Select avatar
          </label>
        </div>
        <div className="md:w-2/3">
          <input
            type="file"
            id="logo"
            name="logo"
            onChange={handleImage}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="submit"
        >
          Upload Avatar
        </button>
      </div>
    </form>
  );
};

export default AvatarForm;
