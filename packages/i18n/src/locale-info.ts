import type { EnglishCatalog } from "./locales/en/index.js";

export const defaultLocale = "en";

/**
 * Shipped UI locales. Native names are endonyms and must stay untranslated
 * in the picker (D073). English names are the stable sort/search labels.
 */
export const supportedLocales = [
  { id: "en", nativeName: "English", englishName: "English" },
  { id: "zh-CN", nativeName: "简体中文", englishName: "Chinese (Simplified)" },
  { id: "zh-TW", nativeName: "繁體中文", englishName: "Chinese (Traditional)" },
  { id: "de", nativeName: "Deutsch", englishName: "German" },
  { id: "es", nativeName: "Español", englishName: "Spanish" },
  { id: "tr", nativeName: "Türkçe", englishName: "Turkish" },
  { id: "fr", nativeName: "Français", englishName: "French" },
  { id: "ko", nativeName: "한국어", englishName: "Korean" },
  { id: "pt-BR", nativeName: "Português (Brasil)", englishName: "Portuguese (Brazil)" },
] as const;

export type AppLocale = (typeof supportedLocales)[number]["id"];
export type AppLanguageSetting = "auto" | AppLocale;
export type { EnglishCatalog };

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return supportedLocales.some((locale) => locale.id === value);
}

export function isAppLanguageSetting(
  value: string | null | undefined,
): value is AppLanguageSetting {
  return value === "auto" || isAppLocale(value);
}

export function localeInfo(id: AppLocale) {
  return supportedLocales.find((locale) => locale.id === id)!;
}

/**
 * Locales whose script Chinese readers recognise at a glance, kept together at
 * the end of the picker.
 *
 * The list is sorted by English name, which scatters the two Chinese locales
 * into the middle. A reader looking for them expects them adjacent and last,
 * after the alphabetised Western languages, so they are grouped here rather
 * than sorted into the sequence.
 */
const CJK_LOCALE_IDS = new Set<string>(["zh-CN", "zh-TW"]);

/** English first, then other shipped locales by English name, Chinese last. */
export function listedLocales(): (typeof supportedLocales)[number][] {
  const english = supportedLocales.find((locale) => locale.id === "en")!;
  const alphabetical = supportedLocales
    .filter((locale) => locale.id !== "en")
    .slice()
    .sort((a, b) => a.englishName.localeCompare(b.englishName, "en"));
  const others = alphabetical.filter((locale) => !CJK_LOCALE_IDS.has(locale.id));
  const cjk = alphabetical.filter((locale) => CJK_LOCALE_IDS.has(locale.id));
  return [english, ...others, ...cjk];
}

export function resolveLocale(input?: string | null): AppLocale {
  const raw = (input || "").trim();
  if (!raw) return "en";
  const lower = raw.replaceAll("_", "-").toLowerCase();
  if (
    lower === "zh-tw" ||
    lower.startsWith("zh-tw-") ||
    lower === "zh-hant" ||
    lower.startsWith("zh-hant-") ||
    lower === "zh-hk" ||
    lower.startsWith("zh-hk-") ||
    lower === "zh-mo" ||
    lower.startsWith("zh-mo-")
  ) {
    return "zh-TW";
  }
  if (lower === "zh" || lower.startsWith("zh-")) return "zh-CN";
  if (lower === "tr" || lower.startsWith("tr-")) return "tr";
  if (lower === "de" || lower.startsWith("de-")) return "de";
  if (lower === "es" || lower.startsWith("es-")) return "es";
  if (lower === "fr" || lower.startsWith("fr-")) return "fr";
  if (lower === "ko" || lower.startsWith("ko-")) return "ko";
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
  const exact = supportedLocales.find((locale) => locale.id.toLowerCase() === lower);
  if (exact) return exact.id;
  const prefix = supportedLocales.find(
    (locale) =>
      locale.id !== "zh-CN" && lower.startsWith(`${locale.id.toLowerCase()}-`),
  );
  if (prefix) return prefix.id;
  return "en";
}

export function flattenCatalog(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else if (value && typeof value === "object") {
      Object.assign(out, flattenCatalog(value as Record<string, unknown>, path));
    }
  }
  return out;
}
