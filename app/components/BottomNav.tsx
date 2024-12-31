"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type MenuItem, menuItems } from "./nav/menuItems";
import { NavLink } from "react-router";

const MenuItemComponent: React.FC<{ item: MenuItem }> = ({ item }) => {
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 text-xs py-2 font-medium transition-colors hover:text-primary",
          isActive && "text-primary"
        )
      }
    >
      {item.icon}
      {item.title}
    </NavLink>
  );
};

export function BottomNav() {
  return (
    <nav className="fixed md:hidden bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-white shadow-t dark:border-gray-800 dark:bg-gray-950">
      {menuItems.map((item) => (
        <MenuItemComponent key={item.title} item={item} />
      ))}
    </nav>
  );
}
