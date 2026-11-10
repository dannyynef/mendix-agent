import assert from "node:assert/strict";
import { validateDocumentationRequest, checkExpectedDocumentation } from "../src/documentation-policy.ts";

const preview = { name: "MyFirstModule.SE_CheckDueEvents", documentation: "Checks due events.", mode: "preview" };
for (const branch of [undefined, "main", "other", "agent-practice-other"]) {
  assert.throws(() => validateDocumentationRequest(branch, preview), /agent-practice/);
}
assert.equal(validateDocumentationRequest("agent-practice", preview).mode, "preview");
assert.throws(() => validateDocumentationRequest("agent-practice", { ...preview, mode: "apply" }), /expectedDocumentation/);
assert.equal(validateDocumentationRequest("agent-practice", { ...preview, mode: "apply", expectedDocumentation: "" }).expectedDocumentation, "");
assert.throws(() => checkExpectedDocumentation("Edited by someone else", ""), /changed since preview/);
checkExpectedDocumentation("", "");
console.log("Documentation branch restrictions and stale-value checks passed. No Mendix connection was used.");
