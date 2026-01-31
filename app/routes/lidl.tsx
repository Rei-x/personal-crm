import { createFileRoute } from "@tanstack/react-router";
import { CouponCard } from "@/components/CouponCard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, Ticket, TicketCheck } from "lucide-react";
import { LidlPageSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/lidl")({
  component: LidlCoupons,
  pendingComponent: LidlPageSkeleton,
});

function LidlCoupons() {
  const utils = trpc.useUtils();

  const [data] = trpc.lidl.coupons.useSuspenseQuery();

  const activateAll = trpc.lidl.activateAll.useMutation({
    onSuccess: () => utils.lidl.coupons.invalidate(),
  });

  const toggleCoupon = trpc.lidl.toggleCoupon.useMutation({
    onSuccess: () => utils.lidl.coupons.invalidate(),
  });

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="h-full border-r pr-4">
        <div>
          <p className="text-xl font-bold">Kupony</p>
          <div className="flex items-center gap-4">
            <Ticket className="w-6 h-6 mt-[2px]" />
            <p className="text-lg w-4 text-right">{data.coupons.length}</p>
          </div>
          <div className="flex items-center gap-4">
            <TicketCheck className="w-6 h-6 mt-[2px]" />
            <p className="text-lg w-4 text-right">
              {data.coupons.filter((c) => c.isActivated).length}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="mt-8"
          onClick={() => activateAll.mutate()}
          loading={activateAll.isPending}
        >
          Aktywuj wszystkie <Check className="w-6 h-6 ml-2" />
        </Button>
      </div>
      <div className="md:ml-4 mt-4 grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.coupons.map((c) => (
          <CouponCard
            key={c.id}
            {...c}
            onToggle={() =>
              toggleCoupon.mutate({
                promotionId: c.id,
                source: c.source,
                isActivated: c.isActivated,
              })
            }
            isToggling={
              toggleCoupon.isPending &&
              toggleCoupon.variables?.promotionId === c.id
            }
          />
        ))}
      </div>
    </div>
  );
}
