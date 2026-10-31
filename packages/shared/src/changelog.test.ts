import { describe, expect, it } from "vitest";
import {
  CHANGELOG,
  formatChangelogNotes,
  getChangelogEntry,
  normalizeChangelogVersion,
  resolveChangelogLocale,
} from "./changelog.js";
import { loadChangelogCatalog } from "./changelog-loader.js";

describe("changelog catalog", () => {
  it("keeps shipped locale version sets and highlight counts aligned", () => {
    const en = CHANGELOG.en;
    const zh = CHANGELOG["zh-CN"];
    for (const catalog of [
      zh,
      CHANGELOG["zh-TW"],
      CHANGELOG.tr,
      CHANGELOG.de,
      CHANGELOG.es,
      CHANGELOG.fr,
      CHANGELOG.ko,
      CHANGELOG["pt-BR"],
    ]) {
      expect(catalog.map((e) => e.version)).toEqual(en.map((e) => e.version));
      for (let i = 0; i < en.length; i += 1) {
        expect(catalog[i]?.highlights.length).toBe(en[i]?.highlights.length);
        expect(en[i]?.highlights.length).toBeGreaterThan(0);
      }
    }
  });

  it("lists only the releases worth reading about, newest-first", () => {
    // Intermediate builds published while one platform was being fixed are
    // deliberately absent: each was a stepping stone to the next, and listing
    // them buried the release a reader might actually want. A version earns an
    // entry by being a release someone could still be running, not merely by
    // having been published.
    const versions = CHANGELOG.en.map((e) => e.version);
    expect(versions).toEqual(["0.22.13", "0.22.12", "0.22.11", "0.22.10", "0.22.9", "0.22.8", "0.22.1", "0.22.0"]);
    for (const version of versions) {
      expect(version).not.toMatch(/-/);
    }
  });

  it("normalizes versions and resolves locales", () => {
    expect(normalizeChangelogVersion(" v0.2.7 ")).toBe("0.2.7");
    expect(resolveChangelogLocale("zh-CN")).toBe("zh-CN");
    expect(resolveChangelogLocale("zh-TW")).toBe("zh-TW");
    expect(resolveChangelogLocale("zh-Hant")).toBe("zh-TW");
  expect(resolveChangelogLocale("zh_HK")).toBe("zh-TW");
  expect(resolveChangelogLocale("tr-TR")).toBe("tr");
  expect(resolveChangelogLocale("de-DE")).toBe("de");
  expect(resolveChangelogLocale("es-MX")).toBe("es");
  expect(resolveChangelogLocale("fr-CA")).toBe("fr");
  expect(resolveChangelogLocale("ko-KR")).toBe("ko");
  expect(resolveChangelogLocale("ko_KR")).toBe("ko");
  expect(resolveChangelogLocale("pt")).toBe("pt-BR");
  expect(resolveChangelogLocale("pt-BR")).toBe("pt-BR");
  expect(resolveChangelogLocale("pt_BR")).toBe("pt-BR");
    expect(resolveChangelogLocale("en-US")).toBe("en");
    expect(resolveChangelogLocale()).toBe("en");
  });

  it("looks up and formats notes with English fallback", () => {
    const entry = getChangelogEntry("v0.22.8", "en");
    expect(entry?.version).toBe("0.22.8");
    const notes = formatChangelogNotes("0.22.9", "en");
    expect(notes).toMatch(/^• /);
    expect(notes?.split("\n").length).toBe(
      getChangelogEntry("0.22.9", "en")?.highlights.length,
    );
    expect(formatChangelogNotes("9.9.9", "en")).toBeUndefined();
    expect(formatChangelogNotes("0.22.1-rc.6", "en")).toBeUndefined();
  });

  it("loads and caches the catalog for the resolved locale", async () => {
    const catalog = await loadChangelogCatalog("fr-CA");

    expect(catalog).toBe(CHANGELOG.fr);
    expect(await loadChangelogCatalog("fr")).toBe(catalog);
  });
});
