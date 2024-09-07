import { CouponCard } from "@/components/CouponCard";
import { Button } from "@/components/ui/button";
import { lidlPlusClient } from "@/server/services/lidlPlus/client";
import type { Coupon } from "@/server/services/lidlPlus/coupons";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Check, Ticket, TicketCheck } from "lucide-react";
import { zfd } from "zod-form-data";

export const loader = async () => {
  return {
    coupons: await lidlPlusClient.couponPromotionsV2().then((s) =>
      s.sections.flatMap((s) =>
        s.promotions.map(
          (p) =>
            ({
              id: p.id,
              image: p.image,
              apologizeStatus: p.availability.apologizeStatus,
              apologizeText: p.availability.text ?? "",
              type: p.type,
              promotionId: p.promotionId,
              offerTitle: p.discount.title,
              offerDescriptionShort: p.discount.description,
              apologizeTitle: p.availability.title ?? "",
              endValidityDate: p.validity.end,
              startValidityDate: p.validity.start,
              firstColor: p.specialPromotion.color ?? "",
              firstFontColor: p.specialPromotion.fontColor ?? "",
              hasAsterisk: p.discount.hasAsterisk,
              isActivated: p.isActivated,
              isHappyHour: p.isHappyHour,
              isSegmented: p.isProcessing,
              source: p.source,
              isSpecial: p.isSpecial,
              stores: p.stores,
              secondaryColor: null,
              secondaryFontColor: null,
              tagSpecial: p.specialPromotion.tag ?? "",
              title: p.title,
            } satisfies Coupon & { source: string })
        )
      )
    ),
  };
};

const schema = zfd.formData({
  promotionId: zfd.text(),
  isActivated: zfd.text().optional(),
  source: zfd.text(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  if (formData.get("_action") === "activate_all") {
    const allPromos = await lidlPlusClient.couponPromotionsV2();

    for (const section of allPromos.sections) {
      for (const promo of section.promotions) {
        if (!promo.isActivated) {
          await lidlPlusClient.activateCouponPromotionV1(
            promo.id,
            promo.source
          );
        }
      }
    }

    return null;
  }

  if (formData.get("_action") === "activate") {
    const data = schema.parse(formData);

    if (data.isActivated) {
      await lidlPlusClient.deactiveCouponPromotionV1(
        data.promotionId,
        data.source
      );
    } else {
      await lidlPlusClient.activateCouponPromotionV1(
        data.promotionId,
        data.source
      );
    }

    return null;
  }

  return new Response("Invalid action", { status: 400 });
};

const LidlCoupons = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex">
      <div className="h-full border-r pr-4">
        <div>
          <p className="text-xl font-bold">Kupony</p>
          <div className="flex items-center gap-4">
            <Ticket className="w-6 h-6 mt-[2px]" />
            <p className="text-lg w-4 text-right">{data.coupons.length}</p>{" "}
          </div>
          <div className="flex items-center gap-4">
            <TicketCheck className="w-6 h-6 mt-[2px]" />
            <p className="text-lg w-4 text-right">
              {data.coupons.filter((c) => c.isActivated).length}
            </p>{" "}
          </div>
        </div>
        <Form method="POST">
          <input type="hidden" name="_action" value="activate_all" />
          <Button size="lg" className="mt-8">
            Aktywuj wszystkie <Check className="w-6 h-6 ml-2" />
          </Button>
        </Form>
      </div>
      <div className="ml-4 grid grid-cols-3 gap-4">
        {data.coupons.map((c) => (
          <CouponCard key={c.id} {...c} />
        ))}
      </div>
    </div>
  );
};

export default LidlCoupons;
