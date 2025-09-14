// components/dashboard/family/FamilyStyles.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import StyleCard from "../../StyleCard";
import StyleForm from "../../forms/StyleForm";
import ModalLayout from "@/components/shared/ModalLayout";
import PromotionsForm from "../../forms/PromotionsForm";

function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-700 bg-slate-800/80 dark:bg-slate-900/80 shadow-xl animate-pulse h-56"
        />
      ))}
    </div>
  );
}

const FamilyStyles = ({ member }) => {
  const [styles, setStyles] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(true);

  // Promotions modal state
  const [promoOpen, setPromoOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState("");

  useEffect(() => {
    if (!member?.userId || !member?._id) return;
    fetchStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.userId, member?._id]);

  const fetchStyles = async () => {
    try {
      setLoadingStyles(true);
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`
      );
      const data = await res.json();
      setStyles(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load styles.");
    } finally {
      setLoadingStyles(false);
    }
  };

  const handleStylesRefresh = async () => {
    try {
      setLoadingStyles(true);
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`
      );
      if (!res.ok) throw new Error("Failed to fetch updated styles.");
      const updatedStyles = await res.json();
      setStyles(Array.isArray(updatedStyles) ? updatedStyles : []);
    } catch (err) {
      toast.error("Failed to refresh styles");
    } finally {
      setLoadingStyles(false);
    }
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setStyles((prevStyles) =>
      prevStyles.filter((style) => style._id !== deletedStyleId)
    );
  };

  const isLoading = loadingStyles;

  const norm = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  const styleSupportsPromotions = (s) => norm(s?.styleName) !== "wrestling";
  const promotableStyles = useMemo(
    () => styles.filter(styleSupportsPromotions),
    [styles]
  );

  const openPromotionModal = () => {
    setPromoOpen(true);
    setSelectedStyleId(""); // require explicit selection
  };

  const handlePromoClose = async () => {
    await handleStylesRefresh(); // refresh so StyleCards show new promotion history
    setPromoOpen(false);
  };

  const onPromotionUpdated = async (updatedStyle) => {
    // Replace the updated style in-place for immediate feedback
    if (updatedStyle?._id) {
      setStyles((prev) =>
        prev.map((s) =>
          String(s._id) === String(updatedStyle._id) ? updatedStyle : s
        )
      );
    } else {
      await handleStylesRefresh();
    }
    // keep modal open so multiple adds are possible; closing handled by handlePromoClose
  };

  return (
    <div>
      {/* Header and Buttons (left-aligned) */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">
          {member.firstName} {member.lastName}’s Styles/Sports
        </h1>
        <div className="flex items-center gap-2">
          <Button
            className="btn btn-primary"
            onClick={() => setOpen(true)}
          >
            Add Style
          </Button>
          {promotableStyles.length > 0 && (
            <Button
              variant="outline"
              onClick={openPromotionModal}
              className="btn btn-secondary"
            >
              Add Promotion
            </Button>
          )}
        </div>
      </div>

      {/* Helpful message */}
      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/5 dark:bg-black/20 p-4">
        <p className="text-sm">
          Click <span className="font-medium">Add Style</span> to create a
          style/sport for {member.firstName} that you can record match results
          for. Use <span className="font-medium">Add Promotion</span> to track
          rank promotions for styles like Judo and Brazilian Jiu-Jitsu. The most
          recent promotion will be used as the{" "}
          <span className="font-medium">current rank</span>.
        </p>
      </div>

      {/* Add Style Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add Style"
        description="Add a new style/sport here. You can edit this style at any time."
        withCard={true}
      >
        <StyleForm
          user={{ _id: member._id, parentId: member.userId }}
          member={member}
          userType="family"
          setOpen={setOpen}
          onSuccess={handleStylesRefresh}
        />
      </ModalLayout>

      {/* Add Promotion Modal (with style selector) */}
      <ModalLayout
        isOpen={promoOpen}
        onClose={handlePromoClose}
        title="Add Promotion"
        description="Choose a style and update its promotion history."
        withCard={true}
      >
        {promotableStyles.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No styles with promotions to manage yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Style</label>
              <select
                className="border rounded-md px-3 py-2 bg-background"
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
              >
                <option value="">Select a style…</option>
                {promotableStyles.map((s) => (
                  <option
                    key={s._id}
                    value={String(s._id)}
                  >
                    {s.styleName}
                  </option>
                ))}
              </select>
            </div>

            {selectedStyleId ? (
              <PromotionsForm
                userStyleId={selectedStyleId}
                onUpdated={onPromotionUpdated}
                onClose={handlePromoClose}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a style to manage promotions.
              </div>
            )}
          </div>
        )}
      </ModalLayout>

      <hr className="border-gray-200 dark:border-gray-700 my-4" />

      {/* Loading / Empty / Cards */}
      {isLoading ? (
        <SkeletonGrid />
      ) : styles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm">
            No styles yet. Click “Add Style” to create the first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6 mb-2">
          {styles.map((style, index) => (
            <StyleCard
              key={index}
              style={style}
              member={member}
              userType="family"
              onDelete={handleDeleteStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FamilyStyles;
