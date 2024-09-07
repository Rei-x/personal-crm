import * as z from "zod";

export const DiscountSchema = z.object({
  title: z.string(),
  description: z.string(),
  hasAsterisk: z.boolean(),
  scope: z.string(),
});
export type Discount = z.infer<typeof DiscountSchema>;

export const SpecialPromotionSchema = z.object({
  tag: z.string(),
  color: z.string(),
  fontColor: z.string(),
});
export type SpecialPromotion = z.infer<typeof SpecialPromotionSchema>;

export const PromotionCardElementSchema = z.object({
  id: z.string(),
  userPromotionId: z.string(),
  title: z.string(),
  discount: DiscountSchema,
  image: z.string(),
  endValidityDate: z.coerce.date(),
  isSpecial: z.boolean(),
  specialPromotion: SpecialPromotionSchema,
  channel: z.string(),
  source: z.string(),
});
export type PromotionCardElement = z.infer<typeof PromotionCardElementSchema>;

export const PromotionCards = z.array(PromotionCardElementSchema);
