import assert from "node:assert/strict";
import { executeDecisionUpdate, validateDecisionRequest } from "../src/decision-policy.ts";
import { assertWriteBranch } from "../src/write-policy.ts";

const calls = [];
const operations = { setExpression: expression => calls.push(["set", expression]),
  flush: async () => { calls.push(["flush"]); }, commit: async () => { calls.push(["commit"]); } };
const snapshot = { branch: "agent-practice", name: "Orders.ValidateOrder", decisionId: "decision-1", expression: "$Order/Total > 0" };
const request = { name: snapshot.name, decisionId: snapshot.decisionId, expression: "$Order/Total >= 10", mode: "preview" };
for (const branch of [undefined, "main", "other"]) {
  assert.throws(() => validateDecisionRequest(branch, request));
}
assertWriteBranch("feature-review", "feature-review");
assert.throws(() => assertWriteBranch("main", "main"));
assert.throws(() => validateDecisionRequest("agent-practice", { ...request, mode: "apply" }), /expectedExpression/);
assert.throws(() => validateDecisionRequest("agent-practice", { ...request, expression: " " }), /Expression/);
const preview = await executeDecisionUpdate(snapshot, request, operations);
assert.equal(preview.before, snapshot.expression);
assert.equal(preview.after, request.expression);
assert.equal(preview.committed, false);
assert.deepEqual(calls, []);
const apply = { ...request, mode: "apply", expectedExpression: preview.before };
await assert.rejects(executeDecisionUpdate({ ...snapshot, expression: "false" }, apply, operations), /changed since preview/);
await assert.rejects(executeDecisionUpdate({ ...snapshot, decisionId: "another-decision" }, apply, operations), /does not match/);
await assert.rejects(executeDecisionUpdate({ ...snapshot, name: "Other.Validate" }, apply, operations), /does not match/);
assert.deepEqual(calls, []);
const applied = await executeDecisionUpdate(snapshot, apply, operations);
assert.equal(applied.committed, true);
assert.deepEqual(calls, [["set", request.expression], ["flush"], ["commit"]]);
calls.length = 0;
const noOp = await executeDecisionUpdate({ ...snapshot, expression: request.expression }, { ...apply, expectedExpression: request.expression }, operations);
assert.equal(noOp.changed, false);
assert.deepEqual(calls, []);
await assert.rejects(executeDecisionUpdate(snapshot, apply, { ...operations, flush: async () => { throw new Error("flush failed"); } }), /flush failed/);
assert.ok(!calls.some(([operation]) => operation === "commit"));
calls.length = 0;
const other = { ...snapshot, name: "Inventory.CanShip", expression: "$Stock/Quantity > 0", decisionId: "different-id" };
await executeDecisionUpdate(other, { name: other.name, decisionId: other.decisionId, expression: "$Stock/Quantity >= $Requested", mode: "apply", expectedExpression: other.expression }, operations);
assert.equal(calls.at(-1)[0], "commit");
console.log("Reusable decision editing tests passed: preview, stale/incorrect targets, branch policy, apply order, no-op, flush failure, and different microflow names. No Mendix connection was used.");
