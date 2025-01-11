import * as z from "zod";

// Style schema
export const StyleFormSchema = z.object({
  styleName: z.string({ required_error: "You must select a style/sport" }),
  rank: z.string(),
  promotionDate: z.date(),
  division: z.string(),
  weightClass: z.string(),
  grip: z.string(),
  favoriteTechnique: z.string().regex(/^[a-zA-Z\s'&-]+$/, {
    message: "Only letters, and spaces are allowed.",
  }),
});
