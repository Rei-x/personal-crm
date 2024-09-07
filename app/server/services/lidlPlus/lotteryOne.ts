import * as z from "zod";

export const LegalTermsSchema = z.object({
  validityText: z.string(),
  startDate: z.coerce.date(),
  termsAndConditions: z.string(),
});
export type LegalTerms = z.infer<typeof LegalTermsSchema>;

export const PrizeSchema = z.object({
  type: z.string(),
});
export type Prize = z.infer<typeof PrizeSchema>;

export const PromotionSchema = z.object({
  logo: z.string(),
  background: z.string(),
  frequency: z.number(),
  text: z.string(),
  type: z.string(),
  mode: z.string(),
});
export type Promotion = z.infer<typeof PromotionSchema>;

export const LotteryOneSchema = z.object({
  id: z.string(),
  type: z.string(),
  creationDate: z.coerce.date(),
  expirationDate: z.coerce.date(),
  promotion: PromotionSchema,
  prize: PrizeSchema,
  legalTerms: LegalTermsSchema,
});
export type LotteryOne = z.infer<typeof LotteryOneSchema>;
