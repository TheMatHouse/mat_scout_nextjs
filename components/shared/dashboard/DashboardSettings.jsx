"use client";
import React, { useState } from "react";
import { GrEdit } from "react-icons/gr";
import ModalFrame from "../modalContainer/ModalFrame";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SettingsForm from "./forms/SettingsForm";

const DashboardSettings = ({ user }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className=" items-center">
        <h1 className="3xl mb-4">Personal Settings</h1>

        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <div className="flex items-center space-x-2 cursor-pointer">
              Update your personal settings
              <GrEdit
                size={22}
                type="button"
                alt="Edit Personal Information"
                className="ps-2 cursor-pointer"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>Personal Settings</DialogTitle>
              <DialogDescription>Edit Personal settings</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <SettingsForm
                athlete={user}
                // styles={styles && styles.styles}
                // techniques={techniques}
                // type="user"
                // setOpen={setOpen}
                // match={selectedMatch}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-4 text-muted-foreground text-xl">
        To update your name, email, username or avatar, click on the avatar
        image in the navbar at the top of this or any page.
      </div>
      <div className="mt-4">
        <div className="mt-2">
          <h3 className="text-xl my-2">Location</h3>
          {"city" in user ? user.city + ", " : ""}
          {"state" in user ? user.state : ""}
          {"country" in user ? " " + user.country : ""}
        </div>
        <hr className="h-2 border-gray-900 dark:border-gray-100 my-3" />

        {/* <h3 className="text-xl my-2">Gender</h3>
        <p className="text-muted-foreground text-sm">Gender is only used for</p>
        <div>
          <strong>Gender:</strong>&nbsp;{" "}
          {user?.gender ? user?.gender : "Not listed"}
        </div> 
        <hr className="h-2 border-gray-900 dark:border-gray-100 my-3" />
        */}
        <div className="mt-2">
          <h3 className="text-xl my-2">Privacy</h3>
          Profile is{" "}
          {!user?.allowPublic || user?.allowPublic === "Private"
            ? "Private"
            : "Public"}
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
