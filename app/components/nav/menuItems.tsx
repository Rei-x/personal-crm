import { Home, ReceiptIcon, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";

export interface MenuItem {
  title: string;
  icon: ReactNode;
  href: string;
  submenu?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  { title: "Rozmowy", icon: <Home className="h-4 w-4" />, href: "/rooms" },
  {
    title: "Paragony",
    icon: <ReceiptIcon className="h-4 w-4" />,
    href: "/receipts",
  },
  {
    title: "Kupony",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: "/lidl",
  },
];
