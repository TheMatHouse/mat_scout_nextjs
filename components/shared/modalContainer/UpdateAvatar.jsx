"use client";
import React from "react";
import AvatarForm from "./AvatarForm";
import { toast } from "react-toastify";
// ICONS
import { IoCloseSharp } from "react-icons/io5";
import { useRouter } from "next/navigation";

const UpdateAvatar = ({ user, userType, handleClose }) => {
  const router = useRouter();
  const handleUseGoogle = async () => {
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
              userId: user._id,
              avatarType: "google",
              //image: image,
            }),
          }
        );

        if (response.status === 200) {
          const data = await response.json();
          const timer = setTimeout(() => {
            toast.success(data.message);
            router.refresh();
            handleClose();
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          toast.error(data.message);
        }
      } else if (userType === "familyMember") {
        // add family member upload here
      }
    } catch (error) {
      toast.error("Unable to upload avatar ", error);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-300 py-3 px-4 mb-4 opacity-100">
        Upload Profile Picture
      </h2>
      <div className="px-4">
        {user.avatarType === "uploaded" ? (
          user.googleAvatar ? (
            <>
              <p>
                You have a google avatar on file. You can either chose to use
                your google avatar by clicking the &quot;Use Google Avatar&quot;
                button or select an image below.
              </p>
              <button
                className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline my-2"
                onClick={handleUseGoogle}
              >
                Use Google Avatar
              </button>
              <br />
              Or
              <AvatarForm
                user={user}
                userType={userType}
                handleClose={handleClose}
              />
            </>
          ) : (
            <>
              <p>Selecte an image from the form below.</p>
              <AvatarForm
                user={user}
                userType={userType}
                handleClose={handleClose}
              />
            </>
          )
        ) : user.avatarType === "google" ? (
          user.googleAvatar && (
            <>
              <p>
                You are currently using your google avatar. To use a different
                avatar, selecte an image from the form below.
                <br />
                You can always change back to your google avatar.
              </p>

              <AvatarForm
                user={user}
                userType={userType}
                handleClose={handleClose}
              />
            </>
          )
        ) : (
          <>
            <p>Selecte an image from the form below.</p>
            <AvatarForm
              user={user}
              userType={userType}
              handleClose={handleClose}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateAvatar;
