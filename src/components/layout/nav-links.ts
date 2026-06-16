// Coach nav targets — shared by the desktop sidebar and mobile drawer. Labels are
// resolved at render via `messages.nav[key]` so they follow the active locale.
export const NAV_LINKS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/athletes", key: "athletes" },
  { href: "/competitions", key: "competitions" },
] as const;
