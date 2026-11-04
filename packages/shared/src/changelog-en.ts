import type { ChangelogEntry } from "./changelog.js";

export const enEntries: ChangelogEntry[] = [
{
    version: "0.22.32",
    date: "2026-11-03",
    highlights: [
      "Sign-in greets you by name, the credits popover reads correctly in dark mode, -extra models keep the base model's thinking levels and gain an \"Extra\" label, and attachment chips in host-connection sessions open again.",
    ],
  },
{
    version: "0.22.31",
    date: "2026-11-03",
    highlights: [
      "The app no longer opens on a blank React error screen: a view-state hook in the credits popover was declared after a signed-out early return, which broke hook order (React #310).",
    ],
  },

{
    version: "0.22.30",
    date: "2026-11-03",
    highlights: [
      "File chips in remote sessions now open again: the file view forwards the session's own id to the Host, so reads resolve inside that session's authorized scratch instead of reporting a path-outside-allowed-roots error.",
      "Gateway -extra models now show their real context window and capabilities - the catalog borrows the base model's published record for -extra deployments.",
      "The account menu greets you (Hi <name>, I am Nib.), lists the included Extra allowance under your plan, and the composer credits popover grows Pro / Pro Extra tabs.",
    ],
  },

{
    version: "0.22.29",
    date: "2026-11-03",
    highlights: [
      "Chips for files uploaded in a session now open everywhere: after local lookup declines, the file view asks the Host that ran the session's tools and reads the copy in that session's private scratch directory.",
    ],
  },
{
    version: "0.22.28",
    date: "2026-11-03",
    highlights: [
      "Clicking an uploaded attachment in a remote session now previews the Host copy: the file view resolves remote scratch paths on the owning Host, scoped to that one session directory.",
    ],
  },

{
    version: "0.22.27",
    date: "2026-11-03",
    highlights: [
      "Files added with the composer + button now ride the structured attachment channel, so a remote session's Host receives the real file and the prompt points at the remote copy - instead of a desktop path the agent can never read.",
    ],
  },

{
    version: "0.22.26",
    date: "2026-11-03",
    highlights: [
      "Every attachment upload decision is now logged in the desktop log, and the prompt resolves the remote binding from the session store directly — closing the last silent-fallback path.",
    ],
  },

{
    version: "0.22.25",
    date: "2026-11-02",
    highlights: [
      "Attachments sent to a pure remote session (the agent runs on the Host) now upload to the Host before the turn starts, with the prompt pointing at the remote copy.",
      "The session-to-execution-host record survives a desktop restart, so attachments keep following the tools after an upgrade.",
    ],
  },

{
    version: "0.22.24",
    date: "2026-11-02",
    highlights: [
      "Attachments in sessions whose tools run on a remote host now upload to that host automatically — including local desktop sessions paired to the host — so the model reads the real file instead of an unusable local path.",
    ],
  },

{
    version: "0.22.23",
    date: "2026-11-02",
    highlights: [
      "Attachments sent to a connected remote host now upload even when the session has no project folder, instead of sending an unreadable local path.",
      "Remote attachment copies mirror the desktop storage layout exactly — same session, directory and file names — so remote tools find them where the local path points.",
      "The composer no longer shows a standing upload notice; uploads stay silent unless a turn fails.",
    ],
  },

{
    version: "0.22.22",
    date: "2026-11-02",
    highlights: [
      "Attachments sent in the local-agent + remote-tools mode now upload to the remote Host's private session directory before the session starts.",
      "Remote Read, Glob and Grep can use the uploaded copies; writes stay inside the project boundaries.",
      "Each upload is capped at 50 MiB per file and verified with SHA-256; the Composer notes that attachments stay on the remote host.",
    ],
  },

{
    version: "0.22.21",
    date: "2026-11-01",
    highlights: [
      "Existing signed-in Nib accounts now load the complete model list after upgrading, without requiring another sign-in.",
      "The gateway's published context and output limits are applied in Composer and runtime while saved selections and manual overrides remain intact.",
      "Model discovery retries after temporary failures and ignores stale results from sign-out, reauthentication, or plugin reloads.",
    ],
  },

{
    version: "0.22.20",
    date: "2026-11-01",
    highlights: [
      "Signing in to Nib now loads your account's full gateway model list with the published context and output limits.",
      "Re-signing in keeps your saved model selection and manual limit overrides while refreshing the published values.",
      "Signing out and back in restores the model metadata again, and a failed model lookup never blocks a valid sign-in.",
    ],
  },

{
    version: "0.22.19",
    date: "2026-11-01",
    highlights: [
      "The Nib service row's click follows its state: signing in takes one click when signed out, and opens the editor when signed in.",
      "Switching the API format on the Nib row now saves and stays — every save no longer resets to Chat Completions.",
      "The composer's model menu shows exactly the models enabled on the Nib row, not the gateway's whole catalogue.",
    ],
  },

{
    version: "0.22.18",
    date: "2026-11-01",
    highlights: [
      "The Nib service is a first-class model-list entry: click the row to edit it, labelled \"Nib account\" with the app mark.",
      "Model selection on the Nib row saves properly — the first open after signing in selects everything the account can call.",
      "Existing Nib rows migrate to the api.nib.am address on the first launch after updating.",
    ],
  },

{
    version: "0.22.17",
    date: "2026-11-01",
    highlights: [
      "The Nib service in the model list can be edited like any other endpoint: API format, models, and per-model settings.",
      "The key the desktop signs in with is named \"Nib\" in the console and cannot be renamed or deleted.",
      "Fixed the reported version number lagging one release behind; the startup wordmark reads \"I am Nib\".",
    ],
  },

{
    version: "0.22.16",
    date: "2026-10-31",
    highlights: [
      "An expired sign-in now reads exactly like being signed out: the stored Nib key is retired, the model picker no longer offers dead entries.",
      "The remote-control settings entry shows its title and Experimental badge again.",
    ],
  },

{
    version: "0.22.15",
    date: "2026-10-31",
    highlights: [
      "The web controller grows the workspace basics: sessions grouped by project with collapsible groups, a model picker and permission-mode switch on the composer, bounded transcript reads, and session titles that stay on one line.",
    ],
  },

{
    version: "0.22.14",
    date: "2026-10-31",
    highlights: [
      "The web controller now loads the workspace on 0.22.13 desktops (the session-detail read used the wrong argument name) and reloads it automatically whenever the desktop reconnects.",
    ],
  },

{
    version: "0.22.13",
    date: "2026-10-31",
    highlights: [
      "The web controller loads the real workspace now: remote commands unwrap the same result envelope the renderer uses, so sessions, transcripts and prompts stop arriving empty.",
    ],
  },


  {
    version: "0.22.12",
    date: "2026-10-31",
    highlights: [
      "The remote control pairing actually attaches now: the desktop used to register under a random sid instead of the one the QR encodes, so every phone attach was rejected as an unknown pairing.",
    ],
  },


  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "The pairing link is now stable per machine: scan once, and the phone keeps working across stop/start cycles and app restarts.",
      "A rotate action mints a fresh link when one ever leaks, retiring every previously scanned QR.",
      "The account popover carries the pairing: one tap unfolds the QR right there.",
      "Pairings can start automatically with the app, so the phone can attach anytime.",
      "The workspace mascot gets the new 16:9 art in both themes, and every empty-workspace greeting now opens with the signature line: \"I am Nib, …\".",
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
