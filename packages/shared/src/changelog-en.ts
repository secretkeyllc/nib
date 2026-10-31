import type { ChangelogEntry } from "./changelog.js";

export const enEntries: ChangelogEntry[] = [

  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "The pairing link is now stable per machine: scan once, and the phone keeps working across stop/start cycles and app restarts.",
      "A rotate action mints a fresh link when one ever leaks, retiring every previously scanned QR.",
      "The account popover carries the pairing: one tap unfolds the QR right there.",
      "Pairings can start automatically with the app, so the phone can attach anytime.",
    ],
  },


  {
    version: "0.22.10",
    date: "2026-10-31",
    highlights: [
      "Control this desktop from a phone or any browser: Settings -> About starts a pairing that only your own account can open.",
      "The web view mirrors the session list and the live transcript, sends prompts, and answers approval cards.",
      "A pairing lives only while it runs — the link rotates on every start and dies with the connection.",
      "The account menu carries the pairing too: one tap unfolds the QR right there.",
    ],
  },


  {
    version: "0.22.9",
    date: "2026-10-30",
    highlights: [
      "Remote hosts install again on machines whose ~/.nib is the ordinary 0755 layout; the installer had refused a safe directory and then blamed the network.",
      "Each allowance window says when it resets — for example \"Resets in 18h 50m\" — in the credits chip and the console.",
      "The version chip reports the installed version instead of the pending update's version.",
      "Settings -> About shows the product mark above the name.",
    ],
  },
  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "The Windows on Arm sidecar no longer needs the Visual C++ Redistributable.",
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
];
