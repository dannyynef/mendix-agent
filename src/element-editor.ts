import { createHash } from "node:crypto";
import { domainmodels, microflows, Element, PartProperty, PartListProperty, PrimitiveProperty,
  type IAbstractUnit, type IStructure } from "mendixmodelsdk";
import { isScalar, type Scalar } from "./model-editor.ts";
import { assertWriteBranch } from "./write-policy.ts";

// Explicit SDK factories and parent classes prevent arbitrary constructors or invalid containment.
const objectTypes = [microflows.Annotation, microflows.ActionActivity, microflows.ExclusiveSplit,
  microflows.StartEvent, microflows.EndEvent, microflows.LoopedActivity, microflows.MicroflowParameterObject];
export const creationCatalog = [
  ...objectTypes.map(ctor => ({ ctor, parent: microflows.MicroflowObjectCollection, property: "objects" })),
  { ctor: domainmodels.Entity, parent: domainmodels.DomainModel, property: "entities" },
  { ctor: domainmodels.Attribute, parent: domainmodels.Entity, property: "attributes" },
  { ctor: domainmodels.Annotation, parent: domainmodels.DomainModel, property: "annotations" }
];
export function creationCapabilities() {
  return creationCatalog.map(c => ({ type: c.ctor.structureTypeName, containerType: c.parent.structureTypeName, property: c.property }));
}

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export function unitFingerprint(unit: IAbstractUnit): string {
  return createHash("sha256").update(JSON.stringify(canonical(unit.toJSON()))).digest("hex");
}
export interface ElementRequest {
  unitId: string; mode: "preview" | "apply"; expectedFingerprint?: string;
  containerId?: string; type?: string; properties?: Record<string, Scalar>; elementId?: string;
}
export function validateElementRequest(branch: string | undefined, operation: string, input: unknown): ElementRequest {
  assertWriteBranch(branch);
  const r = input as ElementRequest;
  const id = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.length <= 200;
  if (!r || !id(r.unitId) || !["preview", "apply"].includes(r.mode) ||
      (r.mode === "apply" && (typeof r.expectedFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(r.expectedFingerprint)))) throw Error("Invalid request or missing preview fingerprint.");
  if (operation === "create") {
    if (!id(r.containerId) || !creationCatalog.some(c => c.ctor.structureTypeName === r.type)) throw Error("Unsupported creation type or invalid container.");
    if (r.properties !== undefined && (!r.properties || Array.isArray(r.properties) || typeof r.properties !== "object")) throw Error("Invalid initial properties.");
    const entries = Object.entries(r.properties ?? {});
    if (entries.length > 100 || entries.some(([k, v]) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(k) || !isScalar(v) || (typeof v === "string" && v.length > 20000))) throw Error("Invalid initial scalar properties.");
  } else if (operation !== "delete" || !id(r.elementId)) throw Error("Invalid deletion target.");
  return r;
}

export async function executeElementOperation(unit: IAbstractUnit, branch: string, operation: "create" | "delete", input: unknown,
  operations: { flush: () => Promise<void>; commit: () => Promise<void> }) {
  const r = validateElementRequest(branch, operation, input);
  if (unit.id !== r.unitId || !unit.isLoaded || unit.isReadOnly) throw Error("Unit mismatch, unloaded or read-only unit.");
  const fingerprint = unitFingerprint(unit);
  if (r.mode === "apply" && fingerprint !== r.expectedFingerprint) throw Error("Unit changed since preview. Preview again.");
  const elements = new Map<string, IStructure>();
  unit.traverse(e => { if (e.unit.id === unit.id) elements.set(e.id, e); });
  let details: Record<string, unknown>;
  let mutate: () => void;
  if (operation === "create") {
    const spec = creationCatalog.find(c => c.ctor.structureTypeName === r.type)!;
    const parent = elements.get(r.containerId!);
    if (!(parent instanceof spec.parent)) throw Error("Incorrect container type.");
    const slot = parent.loadedProperties().find(p => p.name === spec.property && p.isAvailable);
    if (!(slot instanceof PartListProperty)) throw Error("Creation requires an available containment list.");
    // Detached SDK construction validates version support and initial values without adding to the model.
    const draft = spec.ctor.create(unit.model as any);
    for (const [name, value] of Object.entries(r.properties ?? {})) {
      const p = draft.loadedProperties().find(p => p.name === name && p.isAvailable);
      if (!(p instanceof PrimitiveProperty) || !isScalar(p.get()) || typeof p.get() !== typeof value) throw Error("Unsupported initial property or type mismatch.");
      p.set(value);
    }
    details = { type: r.type, containerId: parent.id, property: spec.property, initialProperties: r.properties ?? {}, defaults: draft.toJSON() };
    mutate = () => { slot.get().push(draft); details.createdElementId = draft.id; };
  } else {
    const target = elements.get(r.elementId!);
    if (!(target instanceof Element) || target.id === unit.id || !target.container) throw Error("Only contained elements can be deleted; unit deletion is unsupported.");
    const parent = target.container;
    const slot = parent.loadedProperties().find(p => p.isAvailable &&
      ((p instanceof PartProperty && p.get()?.id === target.id) || (p instanceof PartListProperty && p.get().some(e => e.id === target.id))));
    if (!slot || (slot instanceof PartProperty && slot.isRequired)) throw Error("Cannot delete an element in a required containment slot.");
    const deletedElementIds: string[] = [];
    target.traverse(e => deletedElementIds.push(e.id));
    details = { elementId: target.id, type: target.structureTypeName, containerId: parent.id, property: slot.name,
      deletedElementIds, subtree: target.toJSON() };
    mutate = () => target.delete();
  }
  let committed = false;
  if (r.mode === "apply") {
    mutate();
    await operations.flush();
    await operations.commit();
    committed = true;
  }
  return { unitId: unit.id, branch, operation, mode: r.mode, fingerprint, details, committed,
    limitations: "SDK defaults and reference cleanup apply. Creation does not wire graph connections. Deletion may affect references outside this subtree. Validate consistency and behavior in Studio Pro." };
}
