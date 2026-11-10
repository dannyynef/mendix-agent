import assert from "node:assert/strict";
import { PrimitiveProperty } from "mendixmodelsdk";
import { executeModelEdit, inspectUnit, validateEditRequest } from "../src/model-editor.ts";
const calls = [];
function property(name, initial) {
  let value = initial;
  return Object.assign(Object.create(PrimitiveProperty.prototype), {
    name, get: () => value, set: next => { calls.push([name, next]); value = next; }
  });
}
const caption = property("caption", "Before");
const disabled = property("disabled", false);
// SDK availability is a getter; mock its result on these detached property fixtures.
for (const p of [caption, disabled]) Object.defineProperty(p, "isAvailable", { value: true });
const element = { id: "element", structureTypeName: "Pages.Example", loadedProperties: () => [caption, disabled, { name: "reference", isAvailable: true, get: () => ({ id: "other", structureTypeName: "Pages.Page" }) }] };
const unit = { id: "unit", structureTypeName: "Pages.Page", isLoaded: true, isReadOnly: false, isLoadable: true,
  loadedProperties: () => [], traverse: visit => { visit(unit); visit(element); } };
unit.unit = unit; element.unit = unit; element.container = unit;
const request = { unitId: "unit", mode: "preview", changes: [
  { elementId: "element", property: "caption", value: "After" },
  { elementId: "element", property: "disabled", value: true }
] };
const operations = { flush: async () => calls.push("flush"), commit: async () => calls.push("commit") };
const run = input => executeModelEdit(unit, "agent-practice", input, operations);
const preview = await run(request);
assert.deepEqual(calls, []);
assert.equal(preview.changes[0].before, "Before");
const apply = { ...request, mode: "apply", changes: request.changes.map((c, i) => ({ ...c, expectedValue: preview.changes[i].before })) };
await assert.rejects(run({ ...apply, changes: [apply.changes[0], { ...apply.changes[1], expectedValue: true }] }), /changed since preview/);
assert.deepEqual(calls, []);
for (const property of ["reference", "missing", "__proto__"]) await assert.rejects(run({ ...request, changes: [{ ...request.changes[0], property }] }));
await assert.rejects(run({ ...request, changes: [{ ...request.changes[0], value: false }] }), /type mismatch/);
await assert.rejects(run({ ...request, unitId: "other" }));
await assert.rejects(run({ ...request, changes: [{ ...request.changes[0], elementId: "other" }] }));
for (const branch of [undefined, "main", "master", "trunk", "other"]) assert.throws(() => validateEditRequest(branch, request));
assert.throws(() => validateEditRequest("agent-practice", { ...request, changes: [request.changes[0], request.changes[0]] }), /Duplicate/);
assert.throws(() => validateEditRequest("agent-practice", { ...request, mode: "apply" }));
unit.isReadOnly = true; await assert.rejects(run(request)); unit.isReadOnly = false;
assert.equal(inspectUnit(unit).elements[1].properties[0].editable, true);
assert.equal(inspectUnit(unit).elements[1].properties[2].editable, false);
assert.equal((await run(apply)).committed, true);
assert.deepEqual(calls, [["caption", "After"], ["disabled", true], "flush", "commit"]);
calls.length = 0;
const noop = { ...apply, changes: apply.changes.map(c => ({ ...c, expectedValue: c.value })) };
assert.equal((await run(noop)).committed, false); assert.deepEqual(calls, []);
await assert.rejects(executeModelEdit(unit, "agent-practice", { ...noop, changes: [{ ...noop.changes[0], value: "Fail" }] }, { ...operations, flush: async () => { throw Error("flush failed"); } }), /flush failed/);
assert.ok(!calls.includes("commit"));
console.log("Model editor tests passed: generic inspection, batch validation, preview, stale values, type/target checks, branch/read-only restrictions, no-op and flush failure. No Mendix connection used.");
