import { MendixPlatformClient } from "mendixplatformsdk";
import { microflows } from "mendixmodelsdk";
import { executeDecisionUpdate, validateDecisionRequest } from "./decision-policy.js";

async function main(): Promise<void> {
  let payload = "";
  for await (const chunk of process.stdin) {
    payload += chunk.toString();
    if (payload.length > 100000) throw new Error("Request too large.");
  }
  const branch = process.env.MENDIX_BRANCH?.trim();
  const request = validateDecisionRequest(branch, JSON.parse(payload));
  const appId = process.env.MENDIX_APP_ID?.trim();
  if (!appId || !process.env.MENDIX_TOKEN?.trim()) throw new Error("Missing configuration.");
  const copy = await new MendixPlatformClient().getApp(appId).createTemporaryWorkingCopy(branch!);
  const model = await copy.openModel();
  try {
    const reference = model.allMicroflows().find(flow => flow.qualifiedName === request.name);
    if (!reference) throw new Error("Microflow not found.");
    const flow = await reference.load();
    let decision: microflows.ExclusiveSplit | undefined;
    flow.traverse(element => {
      if (element.id === request.decisionId && element instanceof microflows.ExclusiveSplit) decision = element;
    });
    if (!decision) throw new Error("Decision ID not found in the selected microflow.");
    const target = decision as microflows.ExclusiveSplit;
    const condition = target.splitCondition;
    if (!(condition instanceof microflows.ExpressionSplitCondition)) throw new Error("Only expression-based decisions are supported.");
    const commitMessage = `Update decision expression in ${request.name}`;
    const result = await executeDecisionUpdate({ branch: branch!, name: flow.qualifiedName!,
      decisionId: target.id, expression: condition.expression }, request, {
      setExpression: text => { condition.expression = text; },
      flush: () => model.flushChanges(),
      commit: () => copy.commitToRepository(branch!, { commitMessage })
    });
    const branches = flow.flows.filter(connection => connection.origin.id === target.id).map(connection => ({
      to: connection.destination.id,
      cases: connection instanceof microflows.SequenceFlow ? connection.caseValues.map(value => ({
        type: value.structureTypeName,
        ...(value instanceof microflows.EnumerationCase ? { value: value.value } : {})
      })) : []
    }));
    console.log("MENDIX_RESULT:" + JSON.stringify({ ...result, appId, caption: target.caption, branches, commitMessage,
      limitations: "Changes only the selected decision's expression. Does not validate Mendix expression syntax, referenced attributes, or runtime behavior. Inspect parameter/entity context, review outgoing branch meanings, then check the Errors pane and run behavioral tests in Studio Pro before merging."
    }));
  } finally {
    await model.closeConnection().catch(() => undefined);
  }
}

main().catch(() => {
  console.log("MENDIX_RESULT:" + JSON.stringify({ error: "Decision update failed. Check the configured development branch, microflow name, expression decision ID, and expectedExpression from preview. If apply was requested, inspect the current expression and Team Server history before retrying: commit outcome may be unknown." }));
});
