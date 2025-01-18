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
      <div className="grid grid-cols-2 gap-4 font-semibold p-1">
        <div className="grid font-semibold pt-2">
          <div className="grid">
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
            <p className="text-xl text-muted-foreground my-2">
              To update your name, email, username or avatar, click on the
              avatar image in the navbar at the top of this or any page.
            </p>
          </div>
          <div className="flex flex-col pt-2">
            <div>{`${user.firstName} ${user.lastName}`}</div>
            <div className="mt-2">{`${user.email}`}</div>
            <div className="mt-2">
              <p className="text-xl text-muted-foreground my-2">Location</p>
              {"city" in user ? user.city + ", " : ""}
              {"state" in user ? user.state : ""}
              {"country" in user ? user.country : ""}
            </div>
            <hr className="h-2 border-gray-900 dark:border-gray-100 my-3" />
            <p className="text-xl text-muted-foreground my-2">Gender</p>

            <div>
              <strong>Gender:</strong>&nbsp;{" "}
              {user?.gender ? user?.gender : "Not listed"}
            </div>

            <hr className="h-2 border-gray-900 dark:border-gray-100 my-3" />
            <div className="mt-2">
              Profile is {user?.allowPublic === true ? " Public" : " Private"}
            </div>
          </div>
        </div>
        <div className="grid p-2">
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
