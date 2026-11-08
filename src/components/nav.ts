import { BarChart3, Box, LayoutGrid, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/board", label: "Board", short: "Board", icon: LayoutGrid },
  { href: "/mystery", label: "Mystery Box", short: "Mystery", icon: Box },
  { href: "/macros", label: "Macro budget", short: "Macros", icon: BarChart3 },
  { href: "/fridge", label: "Community Fridge", short: "Fridge", icon: Users },
  { href: "/settings", label: "Goals and diet", short: "Goals", icon: SlidersHorizontal },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/board") return pathname === "/board" || pathname.startsWith("/stickers");
  return pathname === href || pathname.startsWith(`${href}/`);
}
