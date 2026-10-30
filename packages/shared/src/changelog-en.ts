import type { ChangelogEntry } from "./changelog.js";

export const enEntries: ChangelogEntry[] = [

  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "macOS builds are published as a beta: ad-hoc signed, so the first launch needs a one-time approval in System Settings.",
      "The Windows on Arm installer no longer silently drops Nib.exe, and refuses to install on an x64 PC.",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "The local service starts again on Windows on Arm: its runtime is now linked statically.",
      "Installing the Arm build on an x64 PC now stops with a clear message.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "The Windows on Arm installer now extracts Nib.exe and every DLL again.",
      "The Arm installer refuses to run on an x64 PC instead of installing an empty folder.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "Remote hosts upgrade in place: reconnecting brings the Host to this release instead of asking you to rebuild it.",
      "The credits chip keeps your last known balance when the control plane cannot be reached.",
      "Change plan in the account menu now opens the console billing page.",
    ],
  },
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
