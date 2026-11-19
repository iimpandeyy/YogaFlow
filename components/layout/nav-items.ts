/**
 * Primary navigation destinations. Labels are fixed by SDD §2.2 / RC-10 and POLICY §5:
 * do not rename, reorder, or add entries without a documented human decision.
 */
export type NavItem = {
  href: string;
  label: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/yoga", label: "Yoga" },
  { href: "/breathwork", label: "Breathwork" },
  { href: "/meditation", label: "Meditation" },
  { href: "/favorites", label: "Favorites" },
  { href: "/routine", label: "Routine" },
];

/** True when `pathname` is the nav item's page or one of its nested pages. */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
