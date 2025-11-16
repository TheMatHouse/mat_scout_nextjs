// components/teams/forms/ScoutingReportForm.jsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";
import Spinner from "@/components/shared/Spinner";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import FormMultiSelect from "@/components/shared/FormMultiSelect";
import CountrySelect from "@/components/shared/CountrySelect";
import {
  maybeDecryptNotes,
  encryptScoutingBody,
  decryptScoutingBody,
} from "@/lib/crypto/teamLock";

const sortByLabel = (arr) =>
  [...arr].sort((a, b) =>
    String(a?.label ?? "").localeCompare(String(a?.label ?? ""), undefined, {
      sensitivity: "base",
    })
  );

const sortByName = (arr) =>
  [...arr].sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
      sensitivity: "base",
    })
  );

// normalize division select value -> string id
function toDivisionId(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object")
    return String(val.value ?? val._id ?? val.id ?? "");
  return String(val ?? "");
}

function genderLabel(g) {
  if (!g) return "";
  const s = String(g).toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s;
}

function divisionLabel(d) {
  if (!d) return "";
  const g = genderLabel(d.gender);
  return g ? `${d.name} - ${g}` : d.name;
}

/* -------- timestamp helpers (copied from dashboard pattern) -------- */
function hmsToSeconds({ h = 0, m = 0, s = 0 }) {
  const H = Math.max(0, parseInt(h || 0, 10));
  const M = Math.max(0, parseInt(m || 0, 10));
  const S = Math.max(0, parseInt(s || 0, 10));
  return H * 3600 + M * 60 + S;
}
function secondsToHMS(total = 0) {
  const t = Math.max(0, parseInt(total || 0, 10));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return { h, m, s };
}
function parseTimestampFromUrl(url = "") {
  try {
    const u = new URL(url);
    const t = u.searchParams.get("t");
    const start = u.searchParams.get("start");
    let secs = 0;
    if (t) {
      if (/^\d+$/.test(t)) secs = parseInt(t, 10);
      else if (/^\d+s$/.test(t)) secs = parseInt(t, 10);
      else {
        const h = /(\d+)h/.exec(t)?.[1];
        const m = /(\d+)m/.exec(t)?.[1];
        const s = /(\d+)s/.exec(t)?.[1];
        secs =
          (h ? parseInt(h, 10) * 3600 : 0) +
          (m ? parseInt(m, 10) * 60 : 0) +
          (s ? parseInt(s, 10) : 0);
      }
      return Math.max(0, secs || 0);
    }
    if (start && /^\d+$/.test(start)) {
      return Math.max(0, parseInt(start, 10));
    }
  } catch {}
  return 0;
}

/* ----------------- small UI helper ----------------- */
const InfoBox = ({ children }) => (
  <div className="rounded-md border p-3 text-sm text-muted-foreground">
    {children}
  </div>
);

/* ----------------- TimestampInputs (copied pattern) ----------------- */
function TimestampInputs({ valueSeconds = 0, onChange }) {
  const [hh, setHh] = useState("");
  const [mm, setMm] = useState("");
  const [ss, setSs] = useState("");

  useEffect(() => {
    const { h, m, s } = secondsToHMS(valueSeconds || 0);
    setHh(String(h));
    setMm(String(m));
    setSs(String(s));
  }, [valueSeconds]);

  const toInt = (str) => {
    if (str === "" || str == null) return 0;
    const n = parseInt(String(str).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const emit = (hStr, mStr, sStr) => {
    const next = hmsToSeconds({
      h: toInt(hStr),
      m: toInt(mStr),
      s: toInt(sStr),
    });
    onChange?.(next);
  };

  return (
    <div className="mt-4">
      <label className="block text-base font-semibold mb-2">Timestamp</label>
      <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">
        If no timestamp is added, the video will start from the beginning.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Hours</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2"
            value={hh}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setHh(raw);
              emit(raw, mm, ss);
            }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Minutes</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2"
            value={mm}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setMm(raw);
              emit(hh, raw, ss);
            }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Seconds</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-md border px-3 py-2"
            value={ss}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setSs(raw);
              emit(hh, mm, raw);
            }}
          />
        </div>
      </div>
    </div>
  );
}

const ScoutingReportForm = ({ team, report, user, onSuccess, setOpen }) => {
  const router = useRouter();
  const teamSlug = team?.teamSlug || "";

  const newVideosRef = useRef([]);
  const deletedVideoIdsRef = useRef([]);

  const [loadingMembers, setLoadingMembers] = useState(true);
  const [members, setMembers] = useState([]);
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [styleOptions, setStyleOptions] = useState([]);

  const [matchType, setMatchType] = useState(report?.matchType || "");
  const [athleteFirstName, setAthleteFirstName] = useState(
    report?.athleteFirstName || ""
  );
  const [athleteLastName, setAthleteLastName] = useState(
    report?.athleteLastName || ""
  );
  const [athleteNationalRank, setAthleteNationalRank] = useState(
    report?.athleteNationalRank || ""
  );
  const [athleteWorldRank, setAthleteWorldRank] = useState(
    report?.athleteWorldRank || ""
  );
  const [athleteClub, setAthleteClub] = useState(report?.athleteClub || "");
  const [athleteCountry, setAthleteCountry] = useState(
    report?.athleteCountry || ""
  );
  const [athleteGrip, setAthleteGrip] = useState(report?.athleteGrip || "");
  const [athleteAttackNotes, setAthleteAttackNotes] = useState("");

  const [athleteSelected, setAthleteSelected] = useState(
    Array.isArray(report?.athleteAttacks)
      ? report.athleteAttacks.map((t, i) => ({ value: i, label: t }))
      : []
  );
  const [videos, setVideos] = useState(
    Array.isArray(report?.videos)
      ? report.videos.map((v) =>
          typeof v === "string"
            ? v
            : {
                ...v,
                startSeconds:
                  Math.max(0, parseInt(v?.startSeconds ?? 0, 10)) || 0,
              }
        )
      : []
  );
  const [newVideos, setNewVideos] = useState([]);
  const [reportFor, setReportFor] = useState(
    Array.isArray(report?.reportFor)
      ? report.reportFor.map((rf) => ({
          athleteId: rf.athleteId,
          athleteType: rf.athleteType,
        }))
      : []
  );

  /* --------------------- DIVISIONS & WEIGHTS (team version) ---------------------- */
  const [divisions, setDivisions] = useState([]); // [{value,label,gender}]
  const [divisionsLoading, setDivisionsLoading] = useState(false);

  const [divisionId, setDivisionId] = useState(() =>
    toDivisionId(report?.division)
  );

  const [weightOptions, setWeightOptions] = useState([]); // [{value,label}]
  const [weightCategoryId, setWeightCategoryId] = useState(() =>
    String(report?.weightCategory ?? report?.weightItemId ?? "")
  );
  const [weightLabel, setWeightLabel] = useState(report?.weightLabel || "");
  const [weightUnit, setWeightUnit] = useState(report?.weightUnit || "");
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState("");

  // Refs to apply saved division/weight exactly once on edit
  const initialDivisionId = report?.division
    ? String(report.division?._id ?? report.division)
    : "";
  const initialWeightCategoryCandidate =
    report?.weightCategory ?? report?.weightItemId ?? "";
  const initialWeightCategoryId = initialWeightCategoryCandidate
    ? String(initialWeightCategoryCandidate)
    : "";
  const initialWeightLabelRef = useRef(report?.weightLabel || "");
  const initialWeightUnitRef = useRef(report?.weightUnit || "");
  const appliedInitialDivisionRef = useRef(false);
  const appliedInitialWeightRef = useRef(false);

  /* --------------------- populate / reset on report change ---------------------- */
  useEffect(() => {
    if (report) {
      // Base: use whatever is in the document (for non-encrypted teams)
      setMatchType(report.matchType || "");
      setAthleteFirstName(report.athleteFirstName || "");
      setAthleteLastName(report.athleteLastName || "");
      setAthleteNationalRank(report.athleteNationalRank || "");
      setAthleteWorldRank(report.athleteWorldRank || "");
      setAthleteClub(report.athleteClub || "");
      setAthleteCountry(report.athleteCountry || "");
      setAthleteGrip(report.athleteGrip || "");

      setAthleteSelected(
        Array.isArray(report.athleteAttacks)
          ? report.athleteAttacks.map((t, i) => ({ value: i, label: t }))
          : []
      );

      setVideos(
        Array.isArray(report.videos)
          ? report.videos.map((v) =>
              typeof v === "string"
                ? v
                : {
                    ...v,
                    startSeconds:
                      Math.max(0, parseInt(v?.startSeconds ?? 0, 10)) || 0,
                  }
            )
          : []
      );
      setNewVideos([]);
      newVideosRef.current = [];
      deletedVideoIdsRef.current = [];

      setReportFor(
        Array.isArray(report.reportFor)
          ? report.reportFor.map((rf) => ({
              athleteId: rf.athleteId,
              athleteType: rf.athleteType,
            }))
          : []
      );

      setDivisionId(toDivisionId(report.division));
      setWeightCategoryId(
        String(report.weightCategory ?? report.weightItemId ?? "")
      );
      setWeightLabel(report.weightLabel || "");
      setWeightUnit(report.weightUnit || "");

      appliedInitialDivisionRef.current = false;
      appliedInitialWeightRef.current = false;

      // Now layer in decryption if this team uses a lock
      (async () => {
        try {
          // Preferred path: full scouting body stored in report.crypto
          if (report.crypto && report.crypto.ciphertextB64) {
            const decrypted = await decryptScoutingBody(team, report);
            if (decrypted) {
              setAthleteFirstName(decrypted.athleteFirstName || "");
              setAthleteLastName(decrypted.athleteLastName || "");
              setAthleteNationalRank(decrypted.athleteNationalRank || "");
              setAthleteWorldRank(decrypted.athleteWorldRank || "");
              setAthleteClub(decrypted.athleteClub || "");
              setAthleteCountry(decrypted.athleteCountry || "");
              setAthleteGrip(decrypted.athleteGrip || "");
              setAthleteSelected(
                Array.isArray(decrypted.athleteAttacks)
                  ? decrypted.athleteAttacks.map((t, i) => ({
                      value: i,
                      label: t,
                    }))
                  : []
              );
              setAthleteAttackNotes(decrypted.athleteAttackNotes || "");
              return;
            }
          }

          // Backward-compat: older reports where ONLY notes were encrypted
          if (report.athleteAttackNotes) {
            const { plaintext } = await maybeDecryptNotes(
              team,
              report.athleteAttackNotes
            );
            setAthleteAttackNotes(plaintext || "");
          } else {
            setAthleteAttackNotes("");
          }
        } catch {
          // If anything fails, fall back to whatever was stored
          setAthleteAttackNotes(report.athleteAttackNotes || "");
        }
      })();
    } else {
      // New report: clear everything
      setMatchType("");
      setAthleteFirstName("");
      setAthleteLastName("");
      setAthleteNationalRank("");
      setAthleteWorldRank("");
      setAthleteClub("");
      setAthleteCountry("");
      setAthleteGrip("");
      setAthleteAttackNotes("");
      setAthleteSelected([]);
      setVideos([]);
      setNewVideos([]);
      newVideosRef.current = [];
      deletedVideoIdsRef.current = [];
      setReportFor([]);

      setDivisionId("");
      setWeightCategoryId("");
      setWeightLabel("");
      setWeightUnit("");
      appliedInitialDivisionRef.current = false;
      appliedInitialWeightRef.current = false;
    }
  }, [report, team]);

  /* --------------------- Fetch styles ---------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/styles", { cache: "no-store" });
        const data = await res.json();
        const opts = (Array.isArray(data) ? data : [])
          .map((s) =>
            s?.styleName ? { value: s.styleName, label: s.styleName } : null
          )
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label));
        if (alive) setStyleOptions(opts);
      } catch {
        if (alive) setStyleOptions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* --------------------- Fetch members ---------------------- */
  useEffect(() => {
    if (!teamSlug) return;
    (async () => {
      try {
        setLoadingMembers(true);
        const res = await fetch(
          `/api/teams/${teamSlug}/members?ts=${Date.now()}`
        );
        const data = await res.json();
        const membersList = Array.isArray(data.members) ? data.members : [];
        setMembers(sortByName(membersList));
      } catch (err) {
        toast.error("Failed to load team members");
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, [teamSlug]);

  const memberOptions = useMemo(() => {
    const opts = members.map((m) => ({
      value: m.familyMemberId || m.userId,
      label: m.name || "Unknown",
      athleteType: m.familyMemberId ? "family" : "user",
    }));
    const sorted = sortByLabel(opts);

    // Sync labels into reportFor on edit
    if (report && reportFor.length) {
      const map = new Map(sorted.map((o) => [String(o.value), o.label]));
      const updated = reportFor.map((rf) => ({
        ...rf,
        label: map.get(String(rf.athleteId || rf.value)) || rf.label || "",
      }));
      setReportFor(updated);
    }

    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, report]);

  /* --------------------- Fetch techniques ---------------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/techniques", { cache: "no-store" });
        const data = await res.json();
        setLoadedTechniques(
          Array.isArray(data)
            ? data.sort((a, b) => a.name.localeCompare(b.name))
            : []
        );
      } catch {
        setLoadedTechniques([]);
      }
    })();
  }, []);

  const suggestions = useMemo(
    () => loadedTechniques.map((t, i) => ({ value: i, label: t.name })),
    [loadedTechniques]
  );

  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    []
  );
  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );

  /* --------------------- DIVISIONS after style ---------------------- */
  useEffect(() => {
    let alive = true;

    const isEditingSameStyle =
      !!report &&
      !!matchType &&
      String(matchType).toLowerCase() ===
        String(report.matchType || "").toLowerCase();

    if (!isEditingSameStyle) {
      setDivisions([]);
      setDivisionId("");
      setWeightOptions([]);
      setWeightCategoryId("");
      setWeightLabel("");
      setWeightUnit("");
      setWeightsError("");
      appliedInitialDivisionRef.current = false;
      appliedInitialWeightRef.current = false;
    } else {
      setWeightsError("");
    }

    const name = (matchType || "").trim();
    if (!name) return;

    (async () => {
      try {
        setDivisionsLoading(true);
        const res = await fetch(
          `/api/divisions?styleName=${encodeURIComponent(name)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: { accept: "application/json" },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const opts = (data?.divisions || []).map((d) => ({
          value: String(d._id),
          label: divisionLabel(d),
          gender: d.gender || null,
        }));
        setDivisions(opts);

        if (
          isEditingSameStyle &&
          initialDivisionId &&
          !appliedInitialDivisionRef.current
        ) {
          const hasIt = opts.some(
            (o) => String(o.value) === String(initialDivisionId)
          );
          if (hasIt) setDivisionId(String(initialDivisionId));
          appliedInitialDivisionRef.current = true;
        }
      } catch (err) {
        if (!alive) return;
        console.warn("[TeamScoutingReportForm] divisions fetch error:", err);
        setDivisions([]);
      } finally {
        setDivisionsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchType]);

  /* --------------------- WEIGHTS after division ---------------------- */
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const id = toDivisionId(divisionId);
    if (!id || id === "[object Object]") {
      setWeightOptions([]);
      setWeightCategoryId("");
      setWeightLabel("");
      setWeightUnit("");
      setWeightsError("");
      appliedInitialWeightRef.current = false;
      return;
    }

    (async () => {
      try {
        setWeightsLoading(true);
        const url = `/api/divisions/${encodeURIComponent(id)}/weights`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (!alive) return;
          if (res.status !== 404) {
            console.warn("[TeamScoutingReportForm] weights fetch non-200", {
              url,
              status: res.status,
              text,
            });
          }
          setWeightOptions([]);
          setWeightsError(
            res.status === 404
              ? ""
              : `Failed to load weights (HTTP ${res.status}).`
          );
          return;
        }

        let data;
        try {
          data = await res.json();
        } catch (e) {
          if (!alive) return;
          console.warn("[TeamScoutingReportForm] weights JSON parse error:", e);
          setWeightsError("Weights endpoint did not return JSON.");
          return;
        }
        if (!alive) return;

        const wc = data?.weightCategory || {};
        const unit = wc?.unit || data?.unit || "";
        const items = Array.isArray(wc?.items) ? wc.items : [];

        const opts = items
          .map((i, idx) => {
            let lbl =
              (typeof i === "string" && i) ||
              i?.label ||
              i?.name ||
              i?.title ||
              i?.weight ||
              i?.class ||
              "";
            lbl = String(lbl || "").trim();
            if (!lbl) return null;
            const val = String(i?._id ?? i?.value ?? i?.id ?? lbl ?? idx);
            return { value: val, label: lbl };
          })
          .filter(Boolean);

        setWeightOptions(opts);
        setWeightUnit(String(unit || ""));

        if (!appliedInitialWeightRef.current) {
          if (initialWeightCategoryId) {
            const byId = opts.find(
              (o) => String(o.value) === String(initialWeightCategoryId)
            );
            if (byId) {
              setWeightCategoryId(String(initialWeightCategoryId));
              setWeightLabel(byId.label ?? "");
              if (initialWeightUnitRef.current)
                setWeightUnit(initialWeightUnitRef.current);
              appliedInitialWeightRef.current = true;
            }
          }
          if (!appliedInitialWeightRef.current) {
            const savedLabel = (initialWeightLabelRef.current || "")
              .trim()
              .toLowerCase();
            if (savedLabel) {
              const byLabel = opts.find(
                (o) => String(o.label).trim().toLowerCase() === savedLabel
              );
              if (byLabel) {
                setWeightCategoryId(String(byLabel.value));
                setWeightLabel(byLabel.label);
                if (initialWeightUnitRef.current)
                  setWeightUnit(initialWeightUnitRef.current);
                appliedInitialWeightRef.current = true;
              }
            }
          }
        }

        if (!opts.length) setWeightsError("");
      } catch (err) {
        if (controller.signal.aborted) return;
        console.warn("[TeamScoutingReportForm] weights fetch error:", err);
        if (!alive) return;
        setWeightsError("");
        setWeightOptions([]);
      } finally {
        setWeightsLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId]);

  /* --------------------- VIDEO HELPERS ---------------------- */
  const handleExistingVideoChange = (index, field, value) => {
    setVideos((prev) => {
      const next = [...prev];
      const existing = next[index] || {};
      next[index] = { ...existing, [field]: value };
      return next;
    });
  };

  const handleRemoveExistingVideo = (index) => {
    setVideos((prev) => {
      const next = [...prev];
      const toRemove = next[index];
      if (toRemove && toRemove._id) {
        deletedVideoIdsRef.current = [
          ...(deletedVideoIdsRef.current || []),
          String(toRemove._id),
        ];
      }
      next.splice(index, 1);
      return next;
    });
  };

  const handleNewVideoChange = (index, field, value) => {
    setNewVideos((prev) => {
      const next = [...prev];
      const existing = next[index] || {};
      next[index] = { ...existing, [field]: value };
      newVideosRef.current = next;
      return next;
    });
  };

  const handleAddNewVideo = () => {
    setNewVideos((prev) => {
      const next = [
        ...prev,
        { title: "", url: "", notes: "", startSeconds: 0 },
      ];
      newVideosRef.current = next;
      return next;
    });
  };

  const handleRemoveNewVideo = (index) => {
    setNewVideos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      newVideosRef.current = next;
      return next;
    });
  };

  /* --------------------- SUBMIT ---------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!matchType) {
      toast.error("Please select a match type.");
      return;
    }

    // Build the sensitive body we want to protect
    const sensitiveBody = {
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      athleteClub,
      athleteCountry,
      athleteGrip,
      athleteAttacks: athleteSelected.map((i) =>
        String(i.label || "").toLowerCase()
      ),
      athleteAttackNotes,
    };

    let crypto = null;
    let protectedBody = sensitiveBody;

    // Try to encrypt for teams that have a lock
    try {
      const result = await encryptScoutingBody(team, sensitiveBody);
      crypto = result.crypto;
      protectedBody = result.body;
    } catch {
      // If anything fails, we just fall back to plaintext (crypto stays null)
      protectedBody = sensitiveBody;
      crypto = null;
    }

    const payload = {
      teamId: team._id,
      matchType,

      division: divisionId || undefined,
      weightCategory: weightCategoryId || undefined,
      weightLabel: weightLabel || undefined,
      weightUnit: weightUnit || undefined,

      // sensitive fields (possibly blanked if encrypted)
      ...protectedBody,

      reportFor,

      updatedVideos: (videos || []).filter((v) => v && v._id),
      newVideos: newVideosRef.current || [],
      deletedVideos: deletedVideoIdsRef.current || [],
    };

    if (crypto) {
      payload.crypto = crypto;
    }

    const method = report ? "PATCH" : "POST";
    const url = report
      ? `/api/teams/${teamSlug}/scouting-reports/${report._id}`
      : `/api/teams/${teamSlug}/scouting-reports`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save report");
      toast.success(
        data?.message || (report ? "Report updated" : "Report created")
      );
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Error saving report.");
    }
  };

  if (loadingMembers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Spinner size={48} />
        <p className="text-gray-500 dark:text-gray-300 mt-3">
          Loading athletes…
        </p>
      </div>
    );
  }

  const hasDivision = !!divisionId;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <FormMultiSelect
        label="Select Athletes"
        value={reportFor}
        onChange={setReportFor}
        options={memberOptions}
      />

      <FormSelect
        label="Match Type"
        placeholder="Select style/sport..."
        value={matchType}
        onChange={setMatchType}
        options={styleOptions}
        required
      />

      {/* Division & Weight (new, like dashboard) */}
      {divisionsLoading ? (
        <InfoBox>Loading divisions…</InfoBox>
      ) : (
        <FormSelect
          label="Division"
          placeholder={
            divisions.length ? "Select division..." : "No divisions found"
          }
          value={divisionId}
          onChange={(val) => setDivisionId(toDivisionId(val))}
          options={divisions}
          disabled={!divisions.length}
        />
      )}

      {!hasDivision && (
        <InfoBox>Select a division to load weight categories.</InfoBox>
      )}

      {hasDivision &&
        (weightsLoading ? (
          <InfoBox>Loading weight categories…</InfoBox>
        ) : weightsError ? (
          <div className="rounded-md border p-3 text-sm text-red-600 dark:text-red-400">
            {weightsError}
          </div>
        ) : (
          <FormSelect
            label="Weight Category"
            placeholder={
              weightOptions.length
                ? "Select weight..."
                : "No weight categories for this division"
            }
            value={weightCategoryId}
            onChange={(val) => {
              const opt = (weightOptions || []).find(
                (o) => String(o.value) === String(val)
              );
              setWeightCategoryId(String(val));
              setWeightLabel(opt?.label ?? "");
            }}
            options={weightOptions}
            disabled={!weightOptions.length}
          />
        ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Athlete First Name"
          value={athleteFirstName}
          onChange={(e) => setAthleteFirstName(e.target.value)}
          required
        />
        <FormField
          label="Athlete Last Name"
          value={athleteLastName}
          onChange={(e) => setAthleteLastName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="National Rank"
          value={athleteNationalRank}
          onChange={(e) => setAthleteNationalRank(e.target.value)}
        />
        <FormField
          label="World Rank"
          value={athleteWorldRank}
          onChange={(e) => setAthleteWorldRank(e.target.value)}
        />
      </div>

      <FormField
        label="Club"
        value={athleteClub}
        onChange={(e) => setAthleteClub(e.target.value)}
      />

      <CountrySelect
        label="Country"
        value={athleteCountry}
        onChange={setAthleteCountry}
      />

      <div>
        <label className="block mb-1 font-medium">Grip</label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="athleteGrip"
              value="Righty"
              checked={athleteGrip === "Righty"}
              onChange={(e) => setAthleteGrip(e.target.value)}
            />
            Righty
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="athleteGrip"
              value="Lefty"
              checked={athleteGrip === "Lefty"}
              onChange={(e) => setAthleteGrip(e.target.value)}
            />
            Lefty
          </label>
        </div>
      </div>

      <TechniqueTagInput
        label="Known Attacks"
        suggestions={suggestions}
        selected={athleteSelected}
        onAdd={onAthleteAdd}
        onDelete={onAthleteDelete}
      />

      <Editor
        name="athleteAttackNotes"
        text={athleteAttackNotes}
        onChange={setAthleteAttackNotes}
        label="Attack Notes"
      />

      {/* ---------- VIDEOS SECTION with timestamps ---------- */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">Videos</h3>

        {/* existing videos */}
        {Array.isArray(videos) &&
          videos.map((vid, idx) => {
            const isIdOnly = typeof vid === "string";
            const title = isIdOnly ? "" : vid.title || "";
            const url = isIdOnly ? "" : vid.url || "";
            const notes = isIdOnly ? "" : vid.notes || "";
            const startSeconds = isIdOnly
              ? 0
              : Math.max(0, parseInt(vid?.startSeconds ?? 0, 10));

            if (isIdOnly) {
              return (
                <div
                  key={vid}
                  className="rounded-md border p-3 text-sm text-muted-foreground"
                >
                  Existing video (ID: {vid}) is attached to this report. It will
                  be kept when you save, but can’t be edited here.
                </div>
              );
            }

            const idMatch = (url || "").match(
              /(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i
            );
            const embedId = idMatch ? idMatch[1] : null;

            return (
              <div
                key={vid._id || idx}
                className="rounded-lg border p-4 space-y-3 bg-muted/40"
              >
                <FormField
                  label="Video Title"
                  value={title}
                  onChange={(e) =>
                    handleExistingVideoChange(idx, "title", e.target.value)
                  }
                />
                <FormField
                  label="Video URL"
                  value={url}
                  onChange={(e) => {
                    const nextUrl = e.target.value;
                    const parsed = parseTimestampFromUrl(nextUrl);
                    setVideos((prev) => {
                      const next = [...prev];
                      const existing = next[idx] || {};
                      const prevStart = Math.max(
                        0,
                        parseInt(existing.startSeconds ?? 0, 10)
                      );
                      next[idx] = {
                        ...existing,
                        url: nextUrl,
                        startSeconds: parsed || prevStart,
                      };
                      return next;
                    });
                  }}
                />
                <Editor
                  name={`video_notes_${idx}`}
                  label="Video Notes"
                  text={notes}
                  onChange={(val) =>
                    handleExistingVideoChange(idx, "notes", val)
                  }
                />

                <TimestampInputs
                  valueSeconds={startSeconds}
                  onChange={(nextSecs) => {
                    const safe = Math.max(0, parseInt(nextSecs || 0, 10));
                    setVideos((prev) => {
                      const next = [...prev];
                      const existing = next[idx] || {};
                      next[idx] = {
                        ...existing,
                        startSeconds: safe,
                      };
                      return next;
                    });
                  }}
                />

                {embedId && (
                  <iframe
                    className="mt-3 w-full h-52"
                    src={`https://www.youtube.com/embed/${embedId}?start=${startSeconds}`}
                    allowFullScreen
                  />
                )}

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveExistingVideo(idx)}
                  >
                    Remove This Video
                  </Button>
                </div>
              </div>
            );
          })}

        {/* new videos */}
        {Array.isArray(newVideos) &&
          newVideos.map((vid, idx) => {
            const url = vid.url || "";
            const startSeconds = Math.max(
              0,
              parseInt(vid?.startSeconds ?? 0, 10)
            );
            const idMatch = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i);
            const embedId = idMatch ? idMatch[1] : null;

            return (
              <div
                key={`new-${idx}`}
                className="rounded-lg border p-4 space-y-3 bg-muted/40"
              >
                <FormField
                  label="Video Title"
                  value={vid.title || ""}
                  onChange={(e) =>
                    handleNewVideoChange(idx, "title", e.target.value)
                  }
                />
                <FormField
                  label="Video URL"
                  value={url}
                  onChange={(e) => {
                    const nextUrl = e.target.value;
                    const parsed = parseTimestampFromUrl(nextUrl);
                    const safe = parsed
                      ? parsed
                      : Math.max(
                          0,
                          parseInt(
                            typeof vid.startSeconds === "number"
                              ? vid.startSeconds
                              : vid?.startSeconds || 0,
                            10
                          )
                        );
                    handleNewVideoChange(idx, "url", nextUrl);
                    handleNewVideoChange(idx, "startSeconds", safe);
                  }}
                />
                <Editor
                  name={`new_video_notes_${idx}`}
                  label="Video Notes"
                  text={vid.notes || ""}
                  onChange={(val) => handleNewVideoChange(idx, "notes", val)}
                />

                <TimestampInputs
                  valueSeconds={startSeconds}
                  onChange={(nextSecs) => {
                    const safe = Math.max(0, parseInt(nextSecs || 0, 10));
                    handleNewVideoChange(idx, "startSeconds", safe);
                  }}
                />

                {embedId && (
                  <iframe
                    className="mt-3 w-full h-52"
                    src={`https://www.youtube.com/embed/${embedId}?start=${startSeconds}`}
                    allowFullScreen
                  />
                )}

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveNewVideo(idx)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddNewVideo}
        >
          ➕ Add {newVideos.length ? "Another" : "a"} Video
        </Button>
      </div>
      {/* ---------- END VIDEOS SECTION ---------- */}

      <Button
        type="submit"
        className="bg-ms-blue-gray hover:bg-ms-blue text-white"
        disabled={divisionsLoading || weightsLoading}
      >
        {report ? "Update Report" : "Submit Report"}
      </Button>
    </form>
  );
};

export default ScoutingReportForm;
