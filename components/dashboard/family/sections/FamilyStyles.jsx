"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import StyleCard from "../../StyleCard";
import StyleForm from "../../forms/StyleForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FamilyStyles = ({ member }) => {
  const [styles, setStyles] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!member?.userId || !member?._id) return;
    fetchStyles();
  }, [member]);

  const fetchStyles = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`
      );
      const data = await res.json();
      setStyles(data);
    } catch (err) {
      toast.error("Failed to load styles.");
    }
  };

  console.log("styles ", styles);
  const handleStylesRefresh = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`
      );
      if (!res.ok) throw new Error("Failed to fetch updated styles.");
      const updatedStyles = await res.json();
      setStyles(updatedStyles);
    } catch (err) {
      toast.error("Failed to refresh styles");
    }
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setStyles((prevStyles) =>
      prevStyles.filter((style) => style._id !== deletedStyleId)
    );
  };

  return (
    <div>
      {/* Header and Add Style button */}
      <div className="flex items-center">
        <h1 className="text-2xl">
          {member.firstName} {member.lastName}’s Styles/Sports
        </h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          className="min-w-[800px]"
        >
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-500 border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
              Add Style
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>Add Style</DialogTitle>
              <DialogDescription>
                Add a new style/sport here. You can edit this style at any time.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <StyleForm
                user={{
                  _id: member._id,
                  parentId: member.userId, // 👈 parent user ID needed for form submission
                }}
                member={member}
                userType="family"
                setOpen={setOpen}
                onSuccess={handleStylesRefresh}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <hr className="inline-block w-full border-t-1 border-gray-100 mt-2" />

      {/* Style card grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6 mt-3">
        {styles.map((style, index) => (
          <StyleCard
            key={index}
            style={style}
            //user={user}
            member={member}
            userType="family"
            onDelete={handleDeleteStyle}
          />
        ))}
      </div>
    </div>
  );
};

export default FamilyStyles;
