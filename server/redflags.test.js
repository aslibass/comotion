// Safety-rail tests. The rail is the one part of Co-Motion that must not regress, so the
// red-flag screen and the triage questions are tested directly — including the new giant
// cell arteritis screen, and the famous septic-joint case the regex originally missed.
//
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { screen, triageScreen, higher } from "./redflags.js";

const floorFor = (question, condition = "gout") => screen({ condition, question }).floor;

test("giant cell arteritis — free text routes to ED", () => {
  assert.equal(floorFor("I'm 68 and I've got a new headache at my temple and my jaw aches when I chew"), "ED");
  assert.equal(floorFor("bad headache and my vision has gone blurry in one eye"), "ED");
  assert.equal(floorFor("sudden loss of vision and a pounding headache"), "ED");
});

test("giant cell arteritis — the triage question fires on yes and unsure, not no", () => {
  assert.equal(triageScreen({ "t-gca": "yes" }).floor, "ED");
  assert.equal(triageScreen({ "t-gca": "unsure" }).floor, "ED");
  assert.equal(triageScreen({ "t-gca": "no" }).floor, "SELF_MANAGE");
});

test("septic joint — the case the regex originally missed still fires", () => {
  assert.equal(floorFor("my toe is agony and I feel hot and shivery"), "ED");
  assert.equal(triageScreen({ "t-septic": "unsure" }).floor, "ED");
});

test("benign questions are not over-triaged", () => {
  assert.equal(floorFor("can I still have a beer with gout"), "SELF_MANAGE");
  assert.equal(floorFor("I have a mild headache today"), "SELF_MANAGE"); // headache alone is not GCA
  assert.equal(triageScreen({ "t-septic": "no", "t-cauda": "no", "t-rash": "no", "t-gca": "no" }).floor, "SELF_MANAGE");
});

test("the floor is the higher of what was typed and what was asked", () => {
  // A benign-sounding question, but they answered yes to the GCA question -> ED wins.
  const typed = screen({ condition: "knee_oa", question: "my knee is a bit stiff" }).floor;
  const asked = triageScreen({ "t-gca": "yes" }).floor;
  assert.equal(higher(typed, asked), "ED");
});
