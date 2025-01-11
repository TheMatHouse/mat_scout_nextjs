"use client";
import React, { useState } from "react";
import { GrEdit } from "react-icons/gr";
import ModalFrame from "../modalContainer/ModalFrame";

const DashboardSettings = ({ user }) => {
  // Edit Personal Info Modal State
  const [showEditPersonalModal, setShowEditPersonalModal] = useState(false);
  const handleEditPersonalShow = () => setShowEditPersonalModal(true);
  const handleEditPersonalClose = () => setShowEditPersonalModal(false);

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const handleAvatarClose = () => setShowAvatarModal(false);
  const handleAvatarShow = () => setShowAvatarModal(true);

  return (
    <div>
      <h1 className="text-xl">Settings</h1>
      <hr className="inline-block w-full border-t-1 border-gray-100" />
      <div className="flex gap-10 font-semibold p-1">
        <div className="flex flex-col font-semibold pt-2">
          <div className="flex">
            <h2 className="text-lg">Personal Information</h2>
            <GrEdit
              size={22}
              type="button"
              onClick={handleEditPersonalShow}
              alt="Edit Personal Information"
              className="ps-2 cursor-pointer"
            />
          </div>
          <div className="flex flex-col pt-2">
            <div>{`${user.firstName} ${user.lastName}`}</div>
            <div className="mt-2">
              {`${user.email}`}{" "}
              {user.verified === true ? " - verified" : "- not verified"}
            </div>
            <div className="mt-2">
              {`${user.city && user.city + ","} ${user.state && user.state} ${
                user.country && user.country
              } `}
            </div>
            <hr className="h-2 border-gray-900 dark:border-gray-100 my-3" />
            {user?.gender && (
              <div>
                <strong>Gender:</strong>&nbsp; {user?.gender}
              </div>
            )}
            <div className="mt-2">
              Profile is {user?.allowPublic === true ? " Public" : " Private"}
            </div>
          </div>
        </div>
        <div className="p-2">
          <div className="flex">
            <h2 className="text-lg">Profile Picture</h2>
            <GrEdit
              size={22}
              type="button"
              onClick={handleAvatarShow}
              alt="Edit Personal Information"
              className="ps-2 cursor-pointer"
            />
          </div>
          <div className="pt-2">
            <div
              className="w-[160px] h-[160px] rounded-full bg-no-repeat border-2 border-gray-900 bg-gray-100"
              style={{
                backgroundSize: "cover",
                backgroundImage: `url(${
                  user?.avatarType === "google"
                    ? user?.googleAvatar
                    : user?.avatar
                })`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {showEditPersonalModal && (
        <ModalFrame
          show={showEditPersonalModal}
          handleClose={handleEditPersonalClose}
          user={user}
          userType="user"
          modalType="editPersonalInfo"
        />
      )}

      {showAvatarModal && (
        <ModalFrame
          show={showAvatarModal}
          handleClose={handleAvatarClose}
          user={user}
          userType="user"
          modalType="avatar"
        />
      )}
    </div>
  );
};

export default DashboardSettings;
