"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/shared/Spinner";
import TeamUnlockGate from "@/components/teams/TeamUnlockGate";
import { decryptCoachNoteBody } from "@/lib/crypto/teamLock";
import { toast } from "react-toastify";

import CoachEventCard from "./CoachEventCard";
import AddCoachEventModalButton from "./forms/AddCoachEventModalButton";

/* -------------------------------------------------------------
   STORAGE KEYS — unified with scouting reports
------------------------------------------------------------- */
const STORAGE_KEY = (teamId) => `ms:team_pw:${teamId}`;
const TBK_KEY = (teamId) => `ms:team_tbk:${teamId}`;

/* -------------------------------------------------------------
   MAIN CLIENT COMPONENT
------------------------------------------------------------- */
const CoachNotesClient = ({ slug, events, isManagerOrCoach }) => {
  const [team, setTeam] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decryptedEvents, setDecryptedEvents] = useState([]);

  /* -------------------------------------------------------------
     FETCH EVENTS AFTER TEAM IS UNLOCKED
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!slug || !isUnlocked || !team) return;

    const run = async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events?ts=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Failed to load events");

        const json = await res.json().catch(() => ({ events: [] }));
        const list = Array.isArray(json.events) ? json.events : [];

        const out = [];
        let decryptErrors = 0;

        for (const ev of list) {
          // ---- No crypto? Keep plaintext event ----
          if (!ev?.notes || !ev.notes.crypto?.ciphertextB64) {
            out.push(ev);
            continue;
          }

          try {
            const decrypted = await decryptCoachNoteBody(team, ev.notes);

            out.push({
              ...ev,
              notes: decrypted,
            });
          } catch (err) {
            decryptErrors++;
            out.push({
              ...ev,
              notes: { body: "[unable to decrypt]" },
            });
          }
        }

        if (decryptErrors > 0) {
          toast.error(
            `Unable to decrypt ${decryptErrors} event note${
              decryptErrors === 1 ? "" : "s"
            }.`
          );
        }

        setDecryptedEvents(out);
      } catch (err) {
        console.error("COACH NOTES FETCH ERROR:", err);
        toast.error("Failed to load coach notes.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [slug, isUnlocked, team]);

  /* -------------------------------------------------------------
     LOADING STATE (after unlock)
  ------------------------------------------------------------- */
  if (loading && isUnlocked) {
    return (
      <TeamUnlockGate
        slug={slug}
        onTeamResolved={(resolved) => setTeam((prev) => prev || resolved)}
        onUnlocked={() => setIsUnlocked(true)}
      >
        <div className="flex flex-col justify-center items-center h-[60vh]">
          <Spinner size={64} />
          <p className="text-gray-300 mt-3 text-lg">Loading coach notes…</p>
        </div>
      </TeamUnlockGate>
    );
  }

  /* -------------------------------------------------------------
     MAIN RENDER
  ------------------------------------------------------------- */
  return (
    <TeamUnlockGate
      slug={slug}
      onTeamResolved={(resolved) => setTeam((prev) => prev || resolved)}
      onUnlocked={() => setIsUnlocked(true)}
    >
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Events
          </h2>

          {isManagerOrCoach ? <AddCoachEventModalButton slug={slug} /> : null}
        </div>

        {/* EVENTS LIST */}
        {decryptedEvents.length === 0 ? (
          <div className="text-gray-700 dark:text-gray-200">
            No events created yet.
          </div>
        ) : (
          <div className="space-y-6">
            {decryptedEvents.map((ev) => (
              <CoachEventCard
                key={ev._id}
                event={ev}
                slug={slug}
              />
            ))}
          </div>
        )}
      </div>
    </TeamUnlockGate>
  );
};

export default CoachNotesClient;
