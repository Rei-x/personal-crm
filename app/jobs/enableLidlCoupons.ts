import { lidlPlusClient } from "@/server/services/lidlPlus/client";
import { createJob } from "@/server/services/pgboss";

export const enableLidlCoupons = createJob("enableLidlCoupons", async () => {
  const allPromos = await lidlPlusClient.couponPromotionsV2();

  for (const section of allPromos.sections) {
    for (const promo of section.promotions) {
      if (
        !promo.isActivated &&
        promo.validity.start < new Date() &&
        promo.validity.end > new Date()
      ) {
        try {
          await lidlPlusClient.activateCouponPromotionV1(
            promo.id,
            promo.source
          );
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
});
