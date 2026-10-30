import assert from "node:assert/strict";
import test from "node:test";
import { formatRemaining } from "../src/features/chat/composer/use-reset-countdown.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("a countdown prints at most two units", () => {
  // The user asked for exactly these shapes.
  assert.equal(formatRemaining(18 * HOUR + 50 * MINUTE), "18h 50m");
  assert.equal(formatRemaining(2 * DAY + 18 * HOUR), "2d 18h");
  assert.equal(formatRemaining(25 * DAY + 18 * HOUR), "25d 18h");
});

test("short remainders drop to one unit instead of printing 0h", () => {
  assert.equal(formatRemaining(4 * MINUTE), "4m");
  assert.equal(formatRemaining(59_000), "<1m");
});

test("a window that is already due reads as now, never as a negative", () => {
  assert.equal(formatRemaining(0), "now");
  assert.equal(formatRemaining(-5 * MINUTE), "now");
});

test("a missing or broken instant yields no countdown rather than 0m", () => {
  // NaN is what Date.parse gives for an unparsable ISO string; the hook turns
  // that into null before it ever reaches the formatter, but the formatter must
  // not invent a value for it either.
  assert.equal(formatRemaining(Number.NaN), "now");
});

test("day boundaries round down, so 23h 59m is not reported as a day", () => {
  assert.equal(formatRemaining(DAY - MINUTE), "23h 59m");
  assert.equal(formatRemaining(DAY), "1d 0h");
});
