import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_API_URL, normalizeApiUrl, resolveApiUrl } from "../auth/api-url.js";

test("resolveApiUrl falls back to production when NIB_API_URL is unset or blank", () => {
  assert.equal(DEFAULT_API_URL, "https://sknib.com");
  assert.equal(resolveApiUrl({}), "https://sknib.com");
  assert.equal(resolveApiUrl({ NIB_API_URL: "   " }), "https://sknib.com");
});

test("resolveApiUrl honors and normalizes NIB_API_URL", () => {
  assert.equal(resolveApiUrl({ NIB_API_URL: "http://localhost:8787/" }), "http://localhost:8787");
  assert.equal(resolveApiUrl({ NIB_API_URL: "  https://api.sknib.com  " }), "https://api.sknib.com");
});

test("normalizeApiUrl trims whitespace and trailing slashes, and keeps the empty default", () => {
  assert.equal(normalizeApiUrl("https://api.sknib.com///"), "https://api.sknib.com");
  assert.equal(normalizeApiUrl("https://api.sknib.com/"), "https://api.sknib.com");
  assert.equal(normalizeApiUrl("  https://api.sknib.com  "), "https://api.sknib.com");
  assert.equal(normalizeApiUrl(""), "https://sknib.com");
});

test("normalizeApiUrl rejects plain http off-localhost and unparseable URLs", () => {
  assert.throws(() => normalizeApiUrl("http://api.sknib.com"), /https/);
  assert.throws(() => normalizeApiUrl("not a url"), /invalid API URL/);
});

test("plain http stays allowed for localhost and 127.0.0.1", () => {
  assert.equal(normalizeApiUrl("http://localhost:8080"), "http://localhost:8080");
  assert.equal(normalizeApiUrl("http://127.0.0.1:9000"), "http://127.0.0.1:9000");
});
