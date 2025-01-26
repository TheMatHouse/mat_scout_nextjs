import * as z from "zod";

// Style schema
export const StyleFormSchema = z.object({
  styleName: z.string({ required_error: "You must select a style/sport" }),
  rank: z.string(),
  //promotionDate: z.date(),
  division: z.string(),
  weightClass: z.string(),
  grip: z.string(),
  favoriteTechnique: z.string().regex(/^[a-zA-Z\s'&-]+$/, {
    message: "Only letters, and spaces are allowed.",
  }),
});

export const MatchReportSchema = z.object({
  matchType: z.string({ required_error: "Match type is required" }),
  eventName: z.string({ required_error: "Event name is required" }),
  division: z.string(),
  weightCategory: z.string(),
  opponentName: z.string({ required_error: "Opponent name is required" }),
  opponentClub: z.string(),
  opponentRank: z.string(),
  opponentGrip: z.string(),
  opponentCountry: z.string(),
  opponentTechniques: z.string(),
  opponentAttackNotes: z.string().regex(/^[a-zA-Z\s'&-]+$/, {
    message: "Only letters, and spaces are allowed.",
  }),
  athleteTechniques: z.string(),
  athleteAttackNotes: z.string().regex(/^[a-zA-Z\s'&-]+$/, {
    message: "Only letters, and spaces are allowed.",
  }),
  result: z.string(),
  score: z.string(),
  videoTitle: z.string(),
  videoURL: z.string(),
  isPublic: z.boolean(),
});
