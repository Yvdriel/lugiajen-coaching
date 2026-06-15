import { nl } from "@/messages/nl";

/** Coach nav targets — shared by the desktop sidebar and the mobile drawer. */
export const NAV_LINKS = [
  { href: "/dashboard", label: nl.nav.dashboard },
  { href: "/athletes", label: nl.nav.athletes },
  { href: "/competitions", label: nl.nav.competitions },
] as const;
