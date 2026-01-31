import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, TagIcon } from "lucide-react";

interface CouponProps {
  id: string;
  promotionId: string;
  image: string;
  offerTitle: string;
  title: string;
  startValidityDate: Date;
  endValidityDate: Date;
  isActivated: boolean;
  source: string;
  tagSpecial?: string;
  firstColor: string;
  firstFontColor: string;
  isSpecial: boolean;
  isHappyHour: boolean;
  onToggle?: () => void;
  isToggling?: boolean;
}

export function CouponCard({
  image = "https://lidlplusprod.blob.core.windows.net/images/coupons/PL/IDISC0000326402.png?t=1725369394",
  offerTitle = "20 ZŁ RABATU*",
  title = "*na zakupy za min. 200 zł",
  startValidityDate,
  endValidityDate,
  isActivated = false,
  tagSpecial,
  isSpecial = false,
  isHappyHour = false,
  onToggle,
  isToggling = false,
}: CouponProps) {
  return (
    <Card className="w-full flex flex-col justify-between max-w-sm h-full mx-auto">
      <div>
        <CardHeader className="relative p-0">
          <img
            src={image}
            alt="Coupon"
            className="w-full h-56 object-cover rounded-t-lg"
          />
          {isSpecial && (
            <Badge className="absolute top-3 right-3">Specjalna oferta</Badge>
          )}
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <CardTitle className="text-xl font-bold mb-2">
              {offerTitle}
            </CardTitle>
            <p className="text-base text-gray-600">{title}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>
                Ważne: {startValidityDate.toLocaleDateString()} -{" "}
                {endValidityDate.toLocaleDateString()}
              </span>
            </div>
            {tagSpecial && (
              <div className="flex items-center text-sm text-gray-500">
                <TagIcon className="mr-2 h-4 w-4" />
                <span>{tagSpecial}</span>
              </div>
            )}
          </div>
        </CardContent>
      </div>
      <CardFooter className="flex self-end w-full justify-between items-center p-6 bg-gray-50">
        {isHappyHour && <Badge variant="outline">Szczęśliwa godzina</Badge>}
        <Button
          onClick={onToggle}
          loading={isToggling}
          variant={isActivated ? "destructive" : "default"}
          className="ml-auto"
        >
          {isActivated ? "Wyłącz" : "Aktywuj"}
        </Button>
      </CardFooter>
    </Card>
  );
}
