import { z } from "zod";

export const CouponSchema = z.object({
  id: z.string(),
  image: z.string(),
  type: z.string(),
  offerTitle: z.string(),
  title: z.string(),
  offerDescriptionShort: z.string(),
  isSegmented: z.boolean(),
  startValidityDate: z.coerce.date(),
  endValidityDate: z.coerce.date(),
  isActivated: z.boolean(),
  apologizeText: z.string(),
  apologizeStatus: z.boolean(),
  apologizeTitle: z.string(),
  promotionId: z.string(),
  tagSpecial: z.string(),
  firstColor: z.string(),
  secondaryColor: z.null(),
  firstFontColor: z.string(),
  secondaryFontColor: z.null(),
  isSpecial: z.boolean(),
  hasAsterisk: z.boolean(),
  isHappyHour: z.boolean(),
  stores: z.array(z.any()),
});

export type Coupon = z.infer<typeof CouponSchema>;

export const SectionSchema = z.object({
  name: z.string(),
  coupons: z.array(CouponSchema),
});

export const CouponsListSchema = z.object({
  sections: z.array(SectionSchema),
});
