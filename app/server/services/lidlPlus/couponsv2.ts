import * as z from "zod";

export const AvailabilitySchema = z.object({
  apologizeStatus: z.boolean(),
  title: z.string().optional(),
  text: z.string().optional(),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

export const DiscountSchema = z.object({
  title: z.string(),
  description: z.string(),
  hasAsterisk: z.boolean(),
  scope: z.string(),
});
export type Discount = z.infer<typeof DiscountSchema>;

export const SpecialPromotionSchema = z.object({
  tag: z.string().optional(),
  color: z.string().optional(),
  fontColor: z.string().optional(),
});
export type SpecialPromotion = z.infer<typeof SpecialPromotionSchema>;

export const ValiditySchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
});
export type Validity = z.infer<typeof ValiditySchema>;

export const PromotionSchema = z.object({
  id: z.string(),
  promotionId: z.string(),
  image: z.string(),
  type: z.string(),
  discount: DiscountSchema,
  title: z.string(),
  validity: ValiditySchema,
  isActivated: z.boolean(),
  availability: AvailabilitySchema,
  specialPromotion: SpecialPromotionSchema,
  isHappyHour: z.boolean(),
  isSpecial: z.boolean(),
  channel: z.string(),
  source: z.string(),
  stores: z.array(z.any()),
  isProcessing: z.boolean(),
  navigationURL: z.string().optional(),
});
export type Promotion = z.infer<typeof PromotionSchema>;

export const SectionSchema = z.object({
  name: z.string(),
  promotions: z.array(PromotionSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const CouponsV2Schema = z.object({
  sections: z.array(SectionSchema),
});
export type CouponsV2 = z.infer<typeof CouponsV2Schema>;
