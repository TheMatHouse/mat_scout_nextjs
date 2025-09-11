"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import StyleCard from "../../StyleCard";
import StyleForm from "../../forms/StyleForm";
import ModalLayout from "@/components/shared/ModalLayout";

const FamilyStyles = ({ member }) => {
  const [styles, setStyles] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!member?.userId || !member?._id) return;
    fetchStyles();
    fetchSummary();
  }, [member?.userId, member?._id]);

  const fetchStyles = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`,
        { cache: "no-store" }
      );
      const data = await res.json();
      // tolerate either [] or { styles: [] }
      const list = Array.isArray(data) ? data : data?.styles || [];
      setStyles(list);
    } catch (err) {
      console.error("Failed to load styles:", err);
      toast.error("Failed to load styles.");
      setStyles([]);
    }
  };

  // ✅ child’s totals-by-style (wins/losses)
  const fetchSummary = async () => {
    try {
      const res = await fetch(
        `/api/results/summary?athleteId=${encodeURIComponent(member._id)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load results");
      setResultsMap(data?.byStyle || {});
    } catch (err) {
      console.error("Failed to load results summary:", err);
      // Don’t block UI; cards will show 0/0 until next successful fetch
      setResultsMap({});
    }
  };

  const handleStylesRefresh = async () => {
    await Promise.all([fetchStyles(), fetchSummary()]);
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setStyles((prevStyles) =>
      prevStyles.filter((style) => style._id !== deletedStyleId)
    );
  };

  return (
    <div>
      {/* Header and Add Button */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">
          {member.firstName} {member.lastName}’s Styles/Sports
        </h1>
        <Button
          className="bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
          onClick={() => setOpen(true)}
        >
          Add Style
        </Button>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add Style"
        description="Add a new style/sport here. You can edit this style at any time."
        withCard={true}
      >
        <StyleForm
          user={{
            _id: member._id,
            parentId: member.userId, // parent user ID for form submission
          }}
          member={member}
          userType="family"
          setOpen={setOpen}
          onSuccess={handleStylesRefresh}
        />
      </ModalLayout>

      <hr className="border-gray-200 dark:border-gray-700 my-4" />

      {/* Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {styles.map((style) => (
          <StyleCard
            key={style._id}
            style={style}
            member={member}
            userType="family"
            styleResultsMap={resultsMap} // ✅ pass child-specific W/L
            onDelete={handleDeleteStyle}
          />
        ))}
      </div>
    </div>
  );
};

export default FamilyStyles;
