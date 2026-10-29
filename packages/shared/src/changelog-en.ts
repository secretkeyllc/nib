import type { ChangelogEntry } from "./changelog.js";

export const enEntries: ChangelogEntry[] = [
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "Point the app at nib.am after the domain move.",
      "Announcements open in place and clear their unread dot when read.",
      "Report a problem and Release notes now point at the Nib repository.",
      "The browser can hand you back to the app after a web sign-in.",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "First public Nib build: one install, one sign-in, every model.",
      "Sign in with a Nib account; the browser approval page opens with the code already applied.",
      "The composer shows the plan, credits left, and today / week / month usage.",
      "Admin announcements appear above task outcomes in the notification center.",
      "A Windows x64 installer and Linux AppImage/deb are published.",
    ],
  },
];
