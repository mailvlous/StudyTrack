import test from "node:test";
import assert from "node:assert/strict";

import {
  parseLocalDeadline,
  determineDeadlineCategory,
} from "./deadline.js";

const now = new Date("2026-07-06T00:00:00+07:00");

test("deadline tepat 24 jam dikategorikan normal", () => {
  const deadline = parseLocalDeadline("2026-07-07T00:00");
  assert.equal(determineDeadlineCategory(deadline, now), "normal");
});

test("deadline 23 jam 59 menit dikategorikan approaching", () => {
  const deadline = parseLocalDeadline("2026-07-06T23:59");
  assert.equal(determineDeadlineCategory(deadline, now), "approaching");
});

test("deadline 12 jam dikategorikan approaching", () => {
  const deadline = parseLocalDeadline("2026-07-06T12:00");
  assert.equal(determineDeadlineCategory(deadline, now), "approaching");
});

test("deadline tepat sekarang dikategorikan overdue", () => {
  const deadline = parseLocalDeadline("2026-07-06T00:00");
  assert.equal(determineDeadlineCategory(deadline, now), "overdue");
});

test("deadline yang sudah lewat dikategorikan overdue", () => {
  const deadline = parseLocalDeadline("2026-07-05T23:59");
  assert.equal(determineDeadlineCategory(deadline, now), "overdue");
});

test("deadline lebih dari 24 jam dikategorikan normal", () => {
  const deadline = parseLocalDeadline("2026-07-07T00:01");
  assert.equal(determineDeadlineCategory(deadline, now), "normal");
});

test("format deadline dengan detik valid", () => {
  const deadline = parseLocalDeadline("2026-07-06T00:00:30");
  assert.equal(deadline.toISOString(), "2026-07-05T17:00:30.000Z");
});

test("tanggal tidak valid menghasilkan null", () => {
  assert.equal(parseLocalDeadline("2026-02-30T12:00"), null);
});

test("format deadline tidak valid menghasilkan null", () => {
  assert.equal(parseLocalDeadline("2026/07/06 00:00"), null);
});

test("input bukan string menghasilkan null", () => {
  assert.equal(parseLocalDeadline(20260706), null);
});

test("deadline WIB dikonversi ke UTC dengan benar", () => {
  const deadline = parseLocalDeadline("2026-07-06T00:00");
  assert.equal(deadline.toISOString(), "2026-07-05T17:00:00.000Z");
});
