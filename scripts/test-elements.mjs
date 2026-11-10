import assert from "node:assert/strict";
import { AbstractModel, Version, microflows, PartListProperty, PartProperty } from "mendixmodelsdk";
import { creationCatalog, creationCapabilities, executeElementOperation, unitFingerprint, validateElementRequest } from "../src/element-editor.ts";
// Real detached SDK constructors/defaults with an offline model version, no transport.
const model = Object.create(AbstractModel.prototype);
Object.defineProperty(model, "metaModelVersion", { value: Version.parse("10.24.9") });
for (const spec of creationCatalog) {
  const draft = spec.ctor.create(model);
  assert.equal(draft.structureTypeName, spec.ctor.structureTypeName);
  assert.ok(draft.toJSON());
}
const calls = [];
const children = [];
const slot = Object.assign(Object.create(PartListProperty.prototype), { name: "objects", isAvailable: true,
  get: () => ({ push: element => { calls.push("attach"); children.push(element); }, some: fn => children.some(fn) }) });
const parent = Object.create(microflows.MicroflowObjectCollection.prototype);
const unit = { id: "unit", isLoaded: true, isReadOnly: false, model,
  toJSON: () => ({ id: "unit", revision, children: children.map(c => c.toJSON()) }),
  traverse: visit => { visit(unit); visit(parent); children.forEach(visit); } };
let revision = 1;
Object.defineProperties(parent, { id: { value: "parent" }, unit: { value: unit }, loadedProperties: { value: () => [slot] } });
unit.unit = unit;
const ops = { flush: async () => calls.push("flush"), commit: async () => calls.push("commit") };
const request = { unitId: "unit", containerId: "parent", type: microflows.Annotation.structureTypeName,
  properties: { caption: "Created annotation" }, mode: "preview" };
const run = (operation, input, operations = ops) => executeElementOperation(unit, "agent-practice", operation, input, operations);
const preview = await run("create", request);
assert.equal(preview.committed, false); assert.deepEqual(calls, []); assert.equal(children.length, 0);
const apply = { ...request, mode: "apply", expectedFingerprint: preview.fingerprint };
revision++;
await assert.rejects(run("create", apply), /changed since preview/); revision--;
for (const change of [{ containerId: "missing" }, { type: "Arbitrary$Type" }, { properties: { caption: true } }, { properties: { unknown: "x" } }]) {
  await assert.rejects(run("create", { ...request, ...change }));
}
assert.deepEqual(calls, []);
const created = await run("create", apply);
assert.deepEqual(calls, ["attach", "flush", "commit"]);
assert.equal(children[0].caption, "Created annotation"); assert.equal(created.details.createdElementId, children[0].id);
// Keep real SDK element identity; replace transport-facing deletion with a recorded operation.
const target = children[0];
Object.defineProperties(target, { unit: { value: unit }, container: { value: parent },
  delete: { value: () => { calls.push("delete"); children.splice(0, 1); } } });
calls.length = 0;
const deletion = { unitId: "unit", elementId: target.id, mode: "preview" };
const dp = await run("delete", deletion);
assert.ok(dp.details.deletedElementIds.includes(target.id)); assert.deepEqual(calls, []);
const da = { ...deletion, mode: "apply", expectedFingerprint: dp.fingerprint };
await assert.rejects(run("delete", { ...da, expectedFingerprint: "0".repeat(64) }), /changed since preview/);
await assert.rejects(run("delete", { ...deletion, elementId: "unit" }), /contained elements/);
await assert.rejects(run("delete", { ...deletion, elementId: "missing" }));

const required = Object.assign(Object.create(PartProperty.prototype), { name: "required", isAvailable: true, isRequired: true, get: () => target });
// The parent's fixture property descriptor is fixed; use a separate parent for required-slot validation.
const requiredParent = { loadedProperties: () => [required] };
// container descriptor can be reconfigured only on a separate SDK target fixture.
const requiredTarget = Object.create(microflows.Annotation.prototype);
Object.defineProperties(requiredTarget, { id: { value: "required-target" }, unit: { value: unit }, container: { value: requiredParent } });
required.get = () => requiredTarget;
const oldTraverse = unit.traverse;
unit.traverse = visit => { oldTraverse(visit); visit(requiredTarget); };
await assert.rejects(run("delete", { ...deletion, elementId: "required-target" }), /required containment/);
unit.traverse = oldTraverse;
unit.isReadOnly = true; await assert.rejects(run("delete", deletion)); unit.isReadOnly = false;
assert.deepEqual(calls, []);
await run("delete", da); assert.deepEqual(calls, ["delete", "flush", "commit"]);
calls.length = 0;
const fp = unitFingerprint(unit);
await assert.rejects(run("create", { ...apply, expectedFingerprint: fp }, { ...ops, flush: async () => { throw Error("flush failed"); } }), /flush failed/);
assert.deepEqual(calls, ["attach"]);
calls.length = 0;
children.length = 0; // Failed working copy is discarded before the next request.
await assert.rejects(run("create", { ...apply, expectedFingerprint: unitFingerprint(unit) }, { ...ops, commit: async () => { calls.push("commit"); throw Error("commit failed"); } }), /commit failed/);
assert.deepEqual(calls, ["attach", "flush", "commit"]);
for (const branch of [undefined, "main", "other"]) assert.throws(() => validateElementRequest(branch, "create", request));
assert.throws(() => validateElementRequest("agent-practice", "create", { ...apply, expectedFingerprint: undefined }));
assert.equal(creationCapabilities().length, creationCatalog.length);
console.log("Element creation/deletion passed: real SDK detached constructors/defaults, preview without attach/delete/flush/commit, initial properties, containment, stale fingerprints, read-only/branch checks, required slots, subtree preview, apply order, flush and commit failures. No remote connection.");

