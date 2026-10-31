import assert from "node:assert/strict";
import test from "node:test";
import {
  notifyAuthChanged,
  onAuthChanged,
} from "../src/lib/auth-events.ts";

test("every subscriber hears one notification exactly once", () => {
  const heard = [];
  const offA = onAuthChanged(() => heard.push("a"));
  const offB = onAuthChanged(() => heard.push("b"));
  notifyAuthChanged();
  offA();
  offB();
  assert.deepEqual(heard, ["a", "b"]);
});

test("an unsubscribed listener stops hearing notifications", () => {
  const heard = [];
  const off = onAuthChanged(() => heard.push("x"));
  off();
  notifyAuthChanged();
  assert.deepEqual(heard, []);
});

test("a listener that unsubscribes during the emit does not skip its neighbours", () => {
  const heard = [];
  let offMiddle;
  offMiddle = onAuthChanged(() => {
    heard.push("middle");
    offMiddle();
  });
  onAuthChanged(() => heard.push("after"));
  notifyAuthChanged();
  assert.deepEqual(heard, ["middle", "after"]);
});

test("a throwing listener does not stop the listeners after it", () => {
  const heard = [];
  const offBad = onAuthChanged(() => {
    throw new Error("reader is broken");
  });
  onAuthChanged(() => heard.push("survivor"));
  assert.doesNotThrow(() => notifyAuthChanged());
  assert.deepEqual(heard, ["survivor"]);
  offBad();
});
