import { PrimitiveProperty, type IStructure, type IAbstractUnit } from "mendixmodelsdk";
import { assertWriteBranch } from "./write-policy.ts";

export type Scalar = string | number | boolean;
export function isScalar(value: unknown): value is Scalar {
  return typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

export function describeUnit(unit: IAbstractUnit) {
  return { id: unit.id, type: unit.structureTypeName, containerId: unit.container?.id,
    isLoaded: unit.isLoaded, isLoadable: unit.isLoadable, isReadOnly: unit.isReadOnly,
    properties: Object.fromEntries(unit.loadedProperties().filter(p => p.isAvailable && isScalar(p.get())).map(p => [p.name, p.get()])) };
}

export function inspectUnit(unit: IAbstractUnit) {
  const elements: unknown[] = [];
  unit.traverse(element => {
    if (element.unit.id !== unit.id) return;
    elements.push({ id: element.id, type: element.structureTypeName, containerId: element.container?.id,
      properties: element.loadedProperties().filter(p => p.isAvailable).map(p => {
        const value = p.get();
        const summarize = (v: any): unknown => {
          if (v == null || isScalar(v)) return v;
          if (v.id) return { id: v.id, type: v.structureTypeName };
          if (Array.isArray(v)) return v.map(summarize);
          if (typeof v.name === "string") return { name: v.name };
          return { omitted: true };
        };
        return { name: p.name, kind: p.constructor.name, value: summarize(value),
          editable: p instanceof PrimitiveProperty && isScalar(value) && !unit.isReadOnly };
      }) });
  });
  return { unit: describeUnit(unit), elements };
}

export interface EditRequest {
  unitId: string;
  mode: "preview" | "apply";
  changes: { elementId: string; property: string; value: Scalar; expectedValue?: Scalar }[];
}
export function validateEditRequest(branch: string | undefined, input: unknown): EditRequest {
  assertWriteBranch(branch);
  const r = input as EditRequest;
  if (!r || typeof r.unitId !== "string" || !r.unitId.trim() || r.unitId.length > 200 ||
      !["preview", "apply"].includes(r.mode) || !Array.isArray(r.changes) || !r.changes.length || r.changes.length > 100) throw new Error("Invalid edit request.");
  const seen = new Set<string>();
  for (const c of r.changes) {
    if (!c || typeof c.elementId !== "string" || !c.elementId.trim() || c.elementId.length > 200 ||
        typeof c.property !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(c.property) || !isScalar(c.value) ||
        (typeof c.value === "string" && c.value.length > 20000) ||
        (r.mode === "apply" && !isScalar(c.expectedValue))) throw new Error("Invalid change or missing expectedValue.");
    const key = JSON.stringify([c.elementId, c.property]);
    if (seen.has(key)) throw new Error("Duplicate property target.");
    seen.add(key);
  }
  return r;
}

export async function executeModelEdit(unit: IAbstractUnit, branch: string, input: unknown,
  operations: { flush: () => Promise<void>; commit: () => Promise<void> }) {
  const request = validateEditRequest(branch, input);
  if (unit.id !== request.unitId || unit.isReadOnly || !unit.isLoaded) throw new Error("Unit mismatch, read-only, or unloaded unit.");
  const elements = new Map<string, IStructure>();
  unit.traverse(e => { if (e.unit.id === unit.id) elements.set(e.id, e); });
  // Resolve and validate the entire batch before any assignment.
  const plan = request.changes.map(change => {
    const element = elements.get(change.elementId);
    const property = element?.loadedProperties().find(p => p.name === change.property && p.isAvailable);
    if (!(property instanceof PrimitiveProperty)) throw new Error("Only available primitive scalar properties can be edited.");
    const before = property.get();
    if (!isScalar(before) || typeof before !== typeof change.value) throw new Error("Property type mismatch.");
    if (request.mode === "apply" && before !== change.expectedValue) throw new Error("Property changed since preview. Preview again.");
    return { property, result: { elementId: change.elementId, type: element!.structureTypeName,
      property: change.property, before, after: change.value, changed: before !== change.value } };
  });
  let committed = false;
  if (request.mode === "apply" && plan.some(p => p.result.changed)) {
    for (const p of plan) if (p.result.changed) p.property.set(p.result.after);
    await operations.flush();
    await operations.commit();
    committed = true;
  }
  return { unitId: unit.id, branch, mode: request.mode, changes: plan.map(p => p.result), committed };
}
