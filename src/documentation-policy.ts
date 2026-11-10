import { assertWriteBranch } from "./write-policy.ts";

export interface DocumentationRequest {
  name: string;
  documentation: string;
  mode: "preview" | "apply";
  expectedDocumentation?: string;
}

export function validateDocumentationRequest(branch: string | undefined, value: unknown): DocumentationRequest {
  assertWriteBranch(branch);
  if (!value || typeof value !== "object") throw new Error("Invalid documentation request.");
  const input = value as Partial<DocumentationRequest>;
  if (typeof input.name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(input.name)) {
    throw new Error("Use an exact Module.Microflow name.");
  }
  if (typeof input.documentation !== "string" || !input.documentation.trim() || input.documentation.length > 20000) {
    throw new Error("Documentation must contain between 1 and 20000 characters.");
  }
  if (input.mode !== "preview" && input.mode !== "apply") throw new Error("Mode must be preview or apply.");
  if (input.mode === "apply" && typeof input.expectedDocumentation !== "string") {
    throw new Error("Apply requires expectedDocumentation from a preview.");
  }
  return input as DocumentationRequest;
}

export function checkExpectedDocumentation(current: string, expected: string): void {
  if (current !== expected) throw new Error("Documentation changed since preview. Preview again before applying.");
}
