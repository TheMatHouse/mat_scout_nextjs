// components/dashboard/forms/MatchReportForm.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import moment from "moment";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import { matchReportCreated } from "@/lib/analytics/adminEvents";

// UI bits used inside the form (rendered later)
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import Editor from "../../shared/Editor";
import TechniqueTagInput from "../../shared/TechniqueTagInput";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

/* ----------------- helpers ----------------- */
const toIdString = (v) =>
  v && typeof v === "object" && v._id ? String(v._id) : v ? String(v) : "";

function extractStylesShape(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.styles)) return payload.styles;
  if (payload && Array.isArray(payload.userStyles)) return payload.userStyles;
  if (payload && typeof payload === "object") {
    const arr = Object.values(payload).find(Array.isArray);
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

function onlyPrimaryUserStyles(arr, userId) {
  const uid = String(userId || "");
  return (Array.isArray(arr) ? arr : []).filter((s) => {
    const sUid = toIdString(s?.userId);
    const fam = s?.familyMemberId;
    const isMine = sUid && sUid === uid;
    const noFamily =
      fam == null ||
      String(fam) === "" ||
      (typeof fam === "object" && !fam._id);
    return isMine && noFamily;
  });
}

function onlyFamilyMemberStyles(arr, userId, memberId) {
  const uid = String(userId || "");
  const mid = String(memberId || "");
  return (Array.isArray(arr) ? arr : []).filter((s) => {
    const sUid = toIdString(s?.userId);
    const fam = toIdString(s?.familyMemberId);
    return sUid === uid && fam === mid;
  });
}

function normalizeYouTubeToEmbed(url) {
  if (!url) return "";
  if (url.includes("youtu.be")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  if (url.includes("watch?v=")) {
    const id = url.split("watch?v=")[1]?.split("&")[0];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  if (url.includes("embed/")) return url;
  return "";
}

// map matchType text to DB rank.style; null means no ranks
function styleKeyFromMatchType(matchTypeRaw) {
  const s = String(matchTypeRaw || "").toLowerCase();
  if (s.includes("judo")) return "judo";
  if (s.includes("bjj") || s.includes("jiu")) return "bjj";
  if (s.includes("wrestling")) return null; // no ranks for wrestling
  return null; // default: no ranks for unknown styles
}

/* ---- division label helpers ---- */
const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : "Coed";

const inferGenderFromName = (nameRaw) => {
  const name = String(nameRaw || "").toLowerCase();
  if (/\b(men|male|boys?)\b/.test(name)) return "male";
  if (/\b(women|female|girls?)\b/.test(name)) return "female";
  if (/\bM[0-9]+\b/i.test(name)) return "male";
  if (/\bF[0-9]+\b/i.test(name)) return "female";
  if (/\bcoed\b/.test(name)) return "coed";
  if (
    /\b(u[0-9]+|under\s*[0-9]+|bantam|intermediate|juvenile|cadet|junior)\b/.test(
      name
    )
  ) {
    return "coed";
  }
  return "coed";
};
/* ------------------------------------------- */

const MatchReportForm = ({
  athlete, // required for POST/PATCH URLs
  match,
  styles, // optional prop; if empty, we self-fetch then fallback to context
  techniques, // (unused here)
  type, // (unused)
  setOpen,
  onSuccess,
  userType, // "user" | "family"
}) => {
  const userCtx = useUser();
  const userFromCtx = userCtx?.user;
  const refreshUser = userCtx?.refreshUser;

  /* --------------------- ranks ---------------------- */
  const [ranks, setRanks] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/ranks", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        setRanks(arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } catch {
        if (!alive) return;
        setRanks([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* --------------------- styles (prop → fetch → context) ---------------------- */
  const [fetchedStyles, setFetchedStyles] = useState([]);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    async function tryFetch(url) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        const data = await res.json().catch(() => []);
        return extractStylesShape(data);
      } catch {
        return [];
      }
    }

    async function load() {
      setStylesLoaded(false);

      const propHasStyles = Array.isArray(styles) && styles.length > 0;
      if (propHasStyles) {
        if (!alive) return;
        setFetchedStyles([]);
        setStylesLoaded(true);
        return;
      }

      const userId = athlete?.userId || athlete?._id;
      const memberId = athlete?._id;

      let candidates = [];

      if (userId) {
        candidates = await tryFetch(`/api/dashboard/${userId}/userStyles`);
      }

      if ((!candidates || candidates.length === 0) && userId) {
        candidates = await tryFetch(`/api/userStyles`);
      }

      if (
        (!candidates || candidates.length === 0) &&
        userType === "family" &&
        userId &&
        memberId
      ) {
        candidates = await tryFetch(
          `/api/dashboard/${userId}/family/${memberId}/styles`
        );
      }

      let filtered = candidates;
      if (userType === "user") {
        filtered = onlyPrimaryUserStyles(candidates, userId);
      } else if (userType === "family") {
        filtered = onlyFamilyMemberStyles(candidates, userId, memberId);
      }

      if (!alive) return;
      setFetchedStyles(Array.isArray(filtered) ? filtered : []);
      setStylesLoaded(true);
    }

    load();
    return () => {
      alive = false;
    };
  }, [styles, athlete, userType]);

  // prefer prop, else fetch
  const sourceStyles =
    Array.isArray(styles) && styles.length > 0 ? styles : fetchedStyles;

  // final fallback to context if both empty
  const sourceStylesWithCtx =
    Array.isArray(sourceStyles) && sourceStyles.length > 0
      ? sourceStyles
      : Array.isArray(userFromCtx?.userStyles)
      ? userFromCtx.userStyles
      : [];

  const normalizedStyles = useMemo(() => {
    const raw = Array.isArray(sourceStylesWithCtx) ? sourceStylesWithCtx : [];
    return raw
      .map((s) => {
        if (typeof s === "string") {
          const name = s.trim();
          return name ? { styleName: name } : null;
        }
        if (s && typeof s === "object") {
          const name =
            s.styleName ||
            s.name ||
            s.title ||
            s.style ||
            (typeof s.matchType === "string" ? s.matchType : "");
          return name ? { styleName: String(name) } : null;
        }
        return null;
      })
      .filter(Boolean);
  }, [sourceStylesWithCtx]);

  /* --------------------- form state (primitive fields) ---------------------- */
  const [matchType, setMatchType] = useState(match?.matchType || "");
  const [eventName, setEventName] = useState(match?.eventName || "");
  const [matchDate, setMatchDate] = useState(
    match?.matchDate ? moment(match.matchDate).format("YYYY-MM-DD") : ""
  );

  // Divisions + Weights (IDs + snapshot)
  const [divisions, setDivisions] = useState([]);
  const [divisionId, setDivisionId] = useState(
    typeof match?.division === "string"
      ? match.division
      : toIdString(match?.division?._id)
  );

  const [weightOptions, setWeightOptions] = useState([]); // [{ value:itemId, label:'60 kg' }]
  const [weightItemId, setWeightItemId] = useState(match?.weightItemId || "");
  const [weightCategoryId, setWeightCategoryId] = useState(
    typeof match?.weightCategory === "string"
      ? match.weightCategory
      : toIdString(match?.weightCategory?._id)
  );
  const [weightLabel, setWeightLabel] = useState(match?.weightLabel || "");
  const [weightUnit, setWeightUnit] = useState(match?.weightUnit || "");
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsMsg, setWeightsMsg] = useState(""); // UX hint for "No weight categories…" etc.

  // 🔧 debug telemetry for weight fetch
  const [lastWeightsHttp, setLastWeightsHttp] = useState(null); // {url, status} | null
  const [lastWeightsPayload, setLastWeightsPayload] = useState(null); // raw JSON | null

  const [opponentName, setOpponentName] = useState(match?.opponentName || "");
  const [opponentClub, setOpponentClub] = useState(match?.opponentClub || "");
  const [opponentRank, setOpponentRank] = useState("");
  const [myRank, setMyRank] = useState("");
  const [opponentGrip, setOpponentGrip] = useState(match?.opponentGrip || "");
  const [opponentCountry, setOpponentCountry] = useState(
    match?.opponentCountry || ""
  );
  const [oppAttackNotes, setOppAttackNotes] = useState(
    match?.opponentAttackNotes || ""
  );
  const [athAttackNotes, setAthAttackNotes] = useState(
    match?.athleteAttackNotes || ""
  );
  const [result, setResult] = useState(match?.result || "");
  const [score, setScore] = useState(match?.score || "");
  const [videoTitle, setVideoTitle] = useState(
    match?.video?.videoTitle || match?.videoTitle || ""
  );
  const [videoURL, setVideoURL] = useState(
    match?.video?.videoURL || match?.videoURL || ""
  );
  const [isPublic, setIsPublic] = useState(!!match?.isPublic);

  /* --------------------- techniques ---------------------- */
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/techniques", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (!alive) return;
        setLoadedTechniques(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setLoadedTechniques([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const techniqueList = (loadedTechniques || []).map((tech, i) => ({
    label: tech?.name ?? String(tech ?? i),
    value: i,
  }));

  const [opponentSelected, setOpponentSelected] = useState(
    Array.isArray(match?.opponentAttacks)
      ? match.opponentAttacks.map((txt, i) => ({
          value: `opp-${i}-${txt}`,
          label: String(txt),
        }))
      : []
  );
  const [athleteSelected, setAthleteSelected] = useState(
    Array.isArray(match?.athleteAttacks)
      ? match.athleteAttacks.map((txt, i) => ({
          value: `ath-${i}-${txt}`,
          label: String(txt),
        }))
      : []
  );

  const onOpponentAdd = useCallback(
    (tag) => setOpponentSelected((prev) => [...prev, tag]),
    []
  );
  const onOpponentDelete = useCallback(
    (i) => setOpponentSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );
  const onAthleteAdd = useCallback(
    (tag) => setAthleteSelected((prev) => [...prev, tag]),
    []
  );
  const onAthleteDelete = useCallback(
    (i) => setAthleteSelected((prev) => prev.filter((_, idx) => idx !== i)),
    []
  );

  /* --------------------- ranks (verbatim labels from DB) ---------------------- */
  const rankStyle = useMemo(
    () => styleKeyFromMatchType(matchType),
    [matchType]
  );

  const filteredRanks = useMemo(() => {
    if (!rankStyle) return [];
    return (ranks || []).filter(
      (r) => String(r.style).toLowerCase() === rankStyle
    );
  }, [ranks, rankStyle]);

  // Use DB labels as-is
  const friendlyLabelForRank = useCallback(
    (rank) => rank?.label || rank?.code || "",
    []
  );

  const rankOptions = useMemo(() => {
    return filteredRanks.map((r) => {
      const label = friendlyLabelForRank(r);
      const value = `${r.style}:${r.code ?? r._id ?? label}`;
      return { value, label };
    });
  }, [filteredRanks, friendlyLabelForRank]);

  // --- Rehydrate when `match` or `rankOptions` change (AFTER rankOptions is defined) ---
  useEffect(() => {
    if (!match) return;

    const hasRankOptions = Array.isArray(rankOptions) && rankOptions.length > 0;

    setMatchType(match.matchType || "");
    setEventName(match.eventName || "");
    setMatchDate(
      match.matchDate ? moment(match.matchDate).format("YYYY-MM-DD") : ""
    );
    setOpponentName(match.opponentName || "");
    setOpponentClub(match.opponentClub || "");
    setOpponentCountry(match.opponentCountry || "");
    setOpponentGrip(match.opponentGrip || "");
    setResult(match.result || "");
    setScore(match.score || "");

    setVideoTitle(match.video?.videoTitle || match.videoTitle || "");
    setVideoURL(match.video?.videoURL || match.videoURL || "");

    if (hasRankOptions) {
      const toOptionValue = (label) => {
        if (!label) return "";
        const opt = rankOptions.find((o) => o.label === label);
        return opt ? opt.value : "";
      };
      setMyRank(toOptionValue(match.myRank));
      setOpponentRank(toOptionValue(match.opponentRank));
    }

    const oppArr = Array.isArray(match.opponentAttacks)
      ? match.opponentAttacks
      : [];
    setOpponentSelected(
      oppArr.map((txt, i) => ({ value: `opp-${i}-${txt}`, label: String(txt) }))
    );

    const athArr = Array.isArray(match.athleteAttacks)
      ? match.athleteAttacks
      : [];
    setAthleteSelected(
      athArr.map((txt, i) => ({ value: `ath-${i}-${txt}`, label: String(txt) }))
    );

    const divId =
      typeof match.division === "string" ? match.division : match.division?._id;
    if (divId) setDivisionId(String(divId));

    const wcId =
      typeof match.weightCategory === "string"
        ? match.weightCategory
        : match.weightCategory?._id;
    if (wcId) setWeightCategoryId(String(wcId));

    if (match.weightItemId) setWeightItemId(String(match.weightItemId));
    setWeightLabel(match.weightLabel || "");
    setWeightUnit(match.weightUnit || "");
  }, [match, rankOptions]);

  /* --------------------- Divisions by style ---------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const name = (matchType || "").trim();
      if (!name) {
        if (!alive) return;
        setDivisions([]);
        setDivisionId("");
        setWeightOptions([]);
        setWeightItemId("");
        setWeightCategoryId("");
        setWeightUnit("");
        setWeightLabel("");
        setWeightsMsg("");
        setLastWeightsHttp(null);
        setLastWeightsPayload(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/divisions?styleName=${encodeURIComponent(name)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: { accept: "application/json" },
          }
        );
        const data = await res.json().catch(() => ({}));
        const opts = (data?.divisions || []).map((d) => {
          if (d?.label) return { value: d._id, label: d.label };
          const g = d?.gender || inferGenderFromName(d?.name);
          return { value: d._id, label: `${d?.name} — ${genderWord(g)}` };
        });
        if (!alive) return;
        setDivisions(opts);
        if (
          divisionId &&
          !opts.some((o) => String(o.value) === String(divisionId))
        ) {
          setDivisionId("");
        }
      } catch {
        if (!alive) return;
        setDivisions([]);
        setDivisionId("");
        setWeightOptions([]);
        setWeightItemId("");
        setWeightCategoryId("");
        setWeightUnit("");
        setWeightLabel("");
        setWeightsMsg("Failed to load divisions.");
        setLastWeightsHttp(null);
        setLastWeightsPayload(null);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchType]);

  /* --------------------- Weights by division ---------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!divisionId) {
        if (!alive) return;
        setWeightsLoading(false);
        setWeightsMsg("");
        setWeightOptions([]);
        setWeightItemId("");
        setWeightCategoryId("");
        setWeightUnit("");
        setWeightLabel("");
        setLastWeightsHttp(null);
        setLastWeightsPayload(null);
        return;
      }
      setWeightsLoading(true);
      setWeightsMsg("");
      try {
        const url = `/api/divisions/${encodeURIComponent(divisionId)}/weights`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });

        // debug
        setLastWeightsHttp({ url, status: res.status });

        const data = await res.json().catch(() => ({}));
        setLastWeightsPayload(data);

        const cat = data?.weightCategory;
        const items = Array.isArray(cat?.items) ? cat.items : [];
        const unit = cat?.unit || "";
        const catId = cat?._id || "";
        if (!alive) return;

        if (!catId || items.length === 0) {
          setWeightOptions([]);
          setWeightCategoryId("");
          setWeightUnit("");
          setWeightLabel("");
          setWeightsMsg("No weight categories for this division.");
        } else {
          setWeightCategoryId(String(catId));
          setWeightUnit(unit);
          const options = items.map((i) => ({
            value: String(i._id ?? i.value ?? i.label),
            label: i.label ?? String(i),
          }));
          setWeightOptions(options);
          setWeightsMsg("");
          // If current selection is invalid, clear it
          if (
            weightItemId &&
            !options.some((o) => String(o.value) === String(weightItemId))
          ) {
            setWeightItemId("");
            setWeightLabel("");
          }
        }
      } catch {
        if (!alive) return;
        setWeightOptions([]);
        setWeightItemId("");
        setWeightCategoryId("");
        setWeightUnit("");
        setWeightLabel("");
        setWeightsMsg("Failed to load weight categories.");
        setLastWeightsHttp(null);
        setLastWeightsPayload(null);
      } finally {
        if (alive) setWeightsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId]);

  /* --------------------- submit ---------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!matchType) {
      toast.error("Please choose a match type (style) first.");
      return;
    }

    // robust IDs
    const userId =
      athlete?.userId ||
      athlete?._id ||
      (typeof athlete === "object" && athlete ? athlete.id : "");

    const isEdit = !!(match && (match._id || match.id || match.reportId));
    const reportId = isEdit
      ? String(match._id || match.id || match.reportId)
      : "";

    if (!userId || (isEdit && !reportId)) {
      console.error("[MatchReportForm] Missing IDs", {
        userId,
        reportId,
        isEdit,
        match,
      });
      toast.error("Missing userId or reportId");
      return;
    }

    // If division has weights, require one of the snapshots
    if (
      divisionId &&
      weightOptions.length > 0 &&
      !weightItemId &&
      !weightLabel
    ) {
      toast.error("Please select a weight.");
      return;
    }

    const payload = {
      matchType,
      eventName,
      matchDate,
      opponentName,
      opponentClub,
      // ranks as human-readable labels (verbatim from DB)
      opponentRank:
        (rankOptions.find((o) => o.value === opponentRank)?.label ?? "") ||
        opponentRank ||
        "",
      myRank:
        (rankOptions.find((o) => o.value === myRank)?.label ?? "") ||
        myRank ||
        "",
      opponentGrip,
      opponentCountry,
      opponentAttacks: (opponentSelected || [])
        .map((t) => String(t.label || "").toLowerCase())
        .filter(Boolean),
      opponentAttackNotes: oppAttackNotes,
      athleteAttacks: (athleteSelected || [])
        .map((t) => String(t.label || "").toLowerCase())
        .filter(Boolean),
      athleteAttackNotes: athAttackNotes,
      result,
      score,
      video: {
        videoTitle,
        videoURL: normalizeYouTubeToEmbed(videoURL),
      },
      isPublic,

      // refs + snapshot
      division: divisionId || undefined,
      weightCategory: weightCategoryId || undefined,
      weightItemId: weightItemId || undefined,
      weightLabel: weightLabel || undefined,
      weightUnit: weightUnit || undefined,

      // include for backend convenience
      userId,
      ...(isEdit ? { reportId } : {}),
    };

    if (userType === "family") {
      payload.familyMemberId = athlete?._id;
    } else {
      payload.athlete = athlete?._id;
      payload.createdBy = athlete?._id;
      payload.createdByName = `${athlete?.firstName ?? ""} ${
        athlete?.lastName ?? ""
      }`.trim();
    }

    const method = isEdit ? "PATCH" : "POST";
    const base = `/api/dashboard/${encodeURIComponent(String(userId))}`;
    const url =
      userType === "family"
        ? isEdit
          ? `${base}/family/${encodeURIComponent(
              String(athlete?._id)
            )}/matchReports/${encodeURIComponent(reportId)}`
          : `${base}/family/${encodeURIComponent(
              String(athlete?._id)
            )}/matchReports`
        : isEdit
        ? `${base}/matchReports/${encodeURIComponent(reportId)}`
        : `${base}/matchReports`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (res.ok) {
        toast.success(data?.message || "Match report saved.");
        onSuccess?.();
        matchReportCreated({ style: matchType, userType, isPublic });
        refreshUser?.();
        setOpen?.(false);
      } else {
        console.error("[MatchReportForm] save failed", res.status, data);
        toast.error(
          data?.message || `Failed to save match report (${res.status}).`
        );
      }
    } catch (err) {
      console.error("[MatchReportForm] network error", err);
      toast.error("An error occurred while saving the match report.");
    }
  };

  // wait until stylesLoaded is true before rendering anything meaningful
  if (!stylesLoaded) {
    return (
      <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900/30">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  // If there are no styles, show ONLY the notice (NOT the form)
  const noStyles = normalizedStyles.length === 0;
  if (noStyles) {
    if (userType === "family") {
      // Family: no link, just instruct to use the Styles tab
      return (
        <div className="rounded-lg border p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-semibold">
            You need a style/sport to add a match report.
          </p>
          <p className="text-sm mt-1">
            This family member’s styles are managed on the{" "}
            <span className="font-semibold">Styles</span> tab in this profile.
            Please add a style there before creating a match report.
          </p>
        </div>
      );
    }

    // User: keep the link to Styles
    return (
      <div className="rounded-lg border p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        <p className="font-semibold">
          You need a style/sport to add a match report.
        </p>
        <p className="text-sm mt-1">
          Please add a style to this profile before creating a match report.
        </p>
        <div className="mt-3">
          <Link
            href="/dashboard/styles"
            onClick={() => setOpen?.(false)}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium underline hover:no-underline"
          >
            Go to Styles
          </Link>
        </div>
      </div>
    );
  }

  /* --------------------- render (form only when styles exist) ---------------------- */
  const isYouTubeURL =
    !!videoURL &&
    (videoURL.includes("youtu.be") ||
      videoURL.includes("youtube.com/watch?v=") ||
      videoURL.includes("youtube.com/embed/"));

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* STYLE (always visible) */}
      <FormSelect
        label="Match Type"
        placeholder="Select Style/Sport…"
        value={matchType}
        onChange={(v) => {
          setMatchType(v);
          // clear dependent selections
          setDivisionId("");
          setDivisions([]);
          setWeightOptions([]);
          setWeightItemId("");
          setWeightCategoryId("");
          setWeightUnit("");
          setWeightLabel("");
          setWeightsMsg("");
          setWeightsLoading(false);
          setLastWeightsHttp(null);
          setLastWeightsPayload(null);
        }}
        options={normalizedStyles.map((s) => {
          const name = s.styleName;
          return { value: name, label: name };
        })}
      />

      {/* STOP: show nothing else until a style is chosen */}
      {!matchType ? null : (
        <>
          <FormField
            label="Event Name"
            name="eventName"
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />

          <FormField
            label="Match Date"
            name="matchDate"
            type="date"
            value={matchDate || ""}
            onChange={(e) => setMatchDate(e.target.value)}
            required
            min="1900-01-01"
            max="2100-12-31"
            onKeyDown={(e) => {
              const allow = [
                "Tab",
                "Shift",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "Escape",
              ];
              if (!allow.includes(e.key)) e.preventDefault();
            }}
            onPaste={(e) => e.preventDefault()}
          />

          {/* DIVISION */}
          <FormSelect
            label="Division"
            placeholder="Select division..."
            value={divisionId}
            onChange={(val) => {
              setDivisionId(val);
              // clear weights when division changes
              setWeightOptions([]);
              setWeightItemId("");
              setWeightCategoryId("");
              setWeightUnit("");
              setWeightLabel("");
              setWeightsMsg("");
              setLastWeightsHttp(null);
              setLastWeightsPayload(null);
            }}
            options={divisions}
            disabled={!matchType}
          />

          {/* WEIGHT */}
          {divisionId ? (
            weightsLoading ? (
              <div className="text-sm text-muted-foreground mt-1">
                Loading weight categories…
              </div>
            ) : weightOptions.length > 0 ? (
              <FormSelect
                label={`Weight Category${weightUnit ? ` (${weightUnit})` : ""}`}
                placeholder="Select weight..."
                value={weightItemId || weightLabel}
                onChange={(val) => {
                  setWeightItemId(val);
                  const found = weightOptions.find(
                    (o) => String(o.value) === String(val)
                  );
                  setWeightLabel(found?.label || "");
                }}
                options={weightOptions}
                disabled={!divisionId || weightOptions.length === 0}
              />
            ) : (
              <div className="text-sm mt-1">
                <div className="text-red-500">
                  {weightsMsg || "No weight categories for this division."}
                </div>
                {lastWeightsPayload ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Debug: weights API (HTTP {lastWeightsHttp?.status ?? "?"})
                    </summary>
                    <pre className="text-[10px] p-2 bg-muted rounded overflow-auto max-h-48">
                      {JSON.stringify(lastWeightsPayload, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            )
          ) : null}

          {/* Opponent / club */}
          <FormField
            label="Opponent's Name"
            name="opponentName"
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            required
          />

          <FormField
            label="Opponent's Club"
            name="opponentClub"
            type="text"
            value={opponentClub}
            onChange={(e) => setOpponentClub(e.target.value)}
          />

          {/* Rank selects only when the chosen style has ranks (Judo/BJJ) */}
          {rankStyle && (
            <>
              <FormSelect
                label="My Rank (at time of match)"
                placeholder="Select rank..."
                value={myRank}
                onChange={setMyRank}
                options={rankOptions}
              />

              <FormSelect
                label="Opponent's Rank"
                placeholder="Select rank..."
                value={opponentRank}
                onChange={setOpponentRank}
                options={rankOptions}
              />
            </>
          )}

          <FormSelect
            label="Opponent's Country"
            placeholder="Select country..."
            value={opponentCountry}
            onChange={setOpponentCountry}
            options={(Countries || []).map((country) => ({
              value:
                country.code3 ?? country.cca3 ?? country.code ?? country.name,
              label: country.name,
            }))}
          />

          <div>
            <label className="block mb-1 font-medium">Opponent's Grip</label>
            <div className="flex gap-4 mt-2">
              {["Righty", "Lefty"].map((side) => (
                <label
                  key={side}
                  className="flex items-center gap-2"
                >
                  <input
                    type="radio"
                    name="opponentGrip"
                    value={side}
                    checked={opponentGrip === side}
                    onChange={(e) => setOpponentGrip(e.target.value)}
                  />
                  {side}
                </label>
              ))}
            </div>
          </div>

          <TechniqueTagInput
            label="Opponent's Techniques"
            name="opponentAttacks"
            selected={opponentSelected}
            suggestions={techniqueList}
            onAdd={onOpponentAdd}
            onDelete={onOpponentDelete}
          />

          <Editor
            name="oppAttackNotes"
            onChange={setOppAttackNotes}
            text={oppAttackNotes}
            label="Opponent's Attack Notes"
          />

          <TechniqueTagInput
            label="Your Techniques"
            name="athleteAttacks"
            selected={athleteSelected}
            suggestions={techniqueList}
            onAdd={onAthleteAdd}
            onDelete={onAthleteDelete}
          />

          <Editor
            name="athAttackNotes"
            onChange={setAthAttackNotes}
            text={athAttackNotes}
            label="My Attack Notes"
          />

          <div>
            <label className="block mb-1 font-medium">Match Result</label>
            <div className="flex gap-4 mt-2">
              {["Won", "Lost"].map((val) => (
                <label
                  key={val}
                  className="flex items-center gap-2"
                >
                  <input
                    type="radio"
                    name="result"
                    value={val}
                    checked={result === val}
                    onChange={(e) => setResult(e.target.value)}
                  />
                  {val}
                </label>
              ))}
            </div>
          </div>

          <FormField
            label="Match Score"
            name="score"
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />

          <FormField
            label="Video Title"
            name="videoTitle"
            type="text"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
          />

          <FormField
            label="YouTube Video URL"
            name="videoURL"
            type="text"
            value={videoURL}
            onChange={(e) => setVideoURL(e.target.value)}
          />

          {isYouTubeURL && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Video Preview:</p>
              <div className="aspect-video w-full mt-4 rounded-lg shadow overflow-hidden">
                <iframe
                  className="w-full h-full"
                  src={normalizeYouTubeToEmbed(videoURL)}
                  title="YouTube Video Preview"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={isPublic}
              onChange={() => setIsPublic((prev) => !prev)}
              className="h-4 w-4 accent-[var(--ms-light-red)]"
            />
            <label
              htmlFor="isPublic"
              className="text-sm font-medium"
            >
              Make this match report public
            </label>
          </div>

          {/* Submit only shows once a style is selected */}
          <div className="pt-4">
            <Button
              type="submit"
              className="btn btn-primary"
            >
              {match ? "Update" : "Submit"} Report
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

export default MatchReportForm;
