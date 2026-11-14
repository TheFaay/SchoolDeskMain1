import assert from "node:assert/strict";
import test from "node:test";
import { koboToDecimal, parseNairaToKobo } from "./paymentAmount";

test("converts naira to kobo without floating point", () => {
  assert.equal(parseNairaToKobo("80000"), 8_000_000);
  assert.equal(parseNairaToKobo("0.01"), 1);
  assert.equal(parseNairaToKobo("123.4"), 12_340);
  assert.equal(koboToDecimal(8_000_000), "80000.00");
  assert.equal(koboToDecimal(1), "0.01");
});

test("rejects malformed, zero, negative, and unsupported amounts", () => {
  for (const value of ["0", "-10", "1.001", "1e3", " 1,000", "10000000000"]) {
    assert.equal(parseNairaToKobo(value), null, value);
  }
});
