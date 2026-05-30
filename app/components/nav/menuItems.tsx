import { CalendarDays, Home, ReceiptIcon, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";

export interface MenuItem {
  title: string;
  icon: ReactNode;
  href: string;
  submenu?: MenuItem[];
  ownerOnly?: boolean;
}

export const menuItems: MenuItem[] = [
  { title: "Rozmowy", icon: <Home className="h-4 w-4" />, href: "/rooms", ownerOnly: true },
  {
    title: "Paragony",
    icon: <ReceiptIcon className="h-4 w-4" />,
    href: "/receipts",
    ownerOnly: true,
  },
  {
    title: "Kupony",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: "/lidl",
    ownerOnly: true,
  },
  {
    title: "Kalendarz",
    icon: <CalendarDays className="h-4 w-4" />,
    href: "/calendar",
  },
];
