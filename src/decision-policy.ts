import { assertWriteBranch } from "./write-policy.ts";

export interface DecisionRequest {
  name: string;
  decisionId: string;
  expression: string;
  mode: "preview" | "apply";
  expectedExpression?: string;
}

export function validateDecisionRequest(branch: string | undefined, value: unknown): DecisionRequest {
  assertWriteBranch(branch);
  if (!value || typeof value !== "object") throw new Error("Invalid decision request.");
  const input = value as Partial<DecisionRequest>;
  if (typeof input.name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(input.name)) {
    throw new Error("Use the exact Module.Microflow name returned by inspection.");
  }
  if (typeof input.decisionId !== "string" || !input.decisionId.trim() || input.decisionId.length > 200) {
    throw new Error("Use the decision ID returned by inspection.");
  }
  if (typeof input.expression !== "string" || !input.expression.trim() || input.expression.length > 20000) {
    throw new Error("Expression must contain between 1 and 20000 characters.");
  }
  if (input.mode !== "preview" && input.mode !== "apply") throw new Error("Mode must be preview or apply.");
  if (input.mode === "apply" && typeof input.expectedExpression !== "string") {
    throw new Error("Apply requires expectedExpression from a preview.");
  }
  return input as DecisionRequest;
}

export async function executeDecisionUpdate(
  snapshot: { branch: string; name: string; decisionId: string; expression: string },
  input: unknown,
  operations: { setExpression: (text: string) => void; flush: () => Promise<void>; commit: () => Promise<void> }
) {
  const request = validateDecisionRequest(snapshot.branch, input);
  if (request.name !== snapshot.name || request.decisionId !== snapshot.decisionId) {
    throw new Error("The inspected target does not match the requested microflow and decision.");
  }
  if (request.mode === "apply" && snapshot.expression !== request.expectedExpression) {
    throw new Error("Expression changed since preview. Inspect and preview again.");
  }
  const result = { name: request.name, branch: snapshot.branch, decisionId: request.decisionId,
    before: snapshot.expression, after: request.expression, changed: snapshot.expression !== request.expression,
    mode: request.mode, committed: false };
  if (request.mode === "apply" && result.changed) {
    operations.setExpression(request.expression);
    await operations.flush();
    await operations.commit();
    result.committed = true;
  }
  return result;
}
