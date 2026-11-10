import { MendixPlatformClient } from "mendixplatformsdk";
import { microflows } from "mendixmodelsdk";

async function main(): Promise<void> {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: npm.cmd run inspect -- MyFirstModule.MyFirstLogic");
    process.exitCode = 1;
    return;
  }
  const appId = process.env.MENDIX_APP_ID?.trim();
  const branch = process.env.MENDIX_BRANCH?.trim();
  if (!appId || !branch || !process.env.MENDIX_TOKEN?.trim()) {
    console.error("Set MENDIX_APP_ID, MENDIX_BRANCH, and MENDIX_TOKEN in your local .env file.");
    process.exitCode = 1;
    return;
  }

  console.log("Opening a temporary online working copy...");
  const app = new MendixPlatformClient().getApp(appId);
  const workingCopy = await app.createTemporaryWorkingCopy(branch);
  const model = await workingCopy.openModel();
  try {
    const reference = model.allMicroflows().find(flow => flow.qualifiedName === name);
    if (!reference) {
      console.error(`Microflow not found: ${name}. Run npm.cmd run list to see available names.`);
      process.exitCode = 1;
      return;
    }
    const flow = await reference.load();
    const objects: Record<string, unknown>[] = [];
    // Traverse containment so activities inside loops are included too.
    flow.traverse(element => {
      if (!(element instanceof microflows.MicroflowObject)) return;
      const item: Record<string, unknown> = { id: element.id, type: element.structureTypeName };
      if (element instanceof microflows.ActionActivity) {
        item.caption = element.caption;
        item.actionType = element.action?.structureTypeName;
        item.disabled = element.disabled;
        item.documentation = element.documentation;
        if (element.action instanceof microflows.MicroflowCallAction) {
          item.calledMicroflow = element.action.microflowCall?.microflowQualifiedName;
          item.arguments = element.action.microflowCall?.parameterMappings.map(mapping => ({
            parameter: mapping.parameterQualifiedName,
            expression: mapping.argument
          }));
        } else if (element.action instanceof microflows.RetrieveAction) {
          const source = element.action.retrieveSource;
          item.outputVariable = element.action.outputVariableName;
          item.retrieveSourceType = source.structureTypeName;
          if (source instanceof microflows.DatabaseRetrieveSource) {
            item.entity = source.entityQualifiedName;
            item.xPathConstraint = source.xPathConstraint;
            item.rangeType = source.range.structureTypeName;
          }
        } else if (element.action instanceof microflows.ChangeObjectAction) {
          item.variable = element.action.changeVariableName;
          item.commit = element.action.commit.name;
          item.refreshInClient = element.action.refreshInClient;
          item.changes = element.action.items.map(change => ({
            member: change.attributeQualifiedName ?? change.associationQualifiedName,
            operation: change.type.name,
            expression: change.value
          }));
        }
      } else if (element instanceof microflows.ExclusiveSplit) {
        item.caption = element.caption;
        item.conditionType = element.splitCondition.structureTypeName;
        if (element.splitCondition instanceof microflows.ExpressionSplitCondition) {
          item.expression = element.splitCondition.expression;
        }
      } else if (element instanceof microflows.EndEvent) {
        item.returnValue = element.returnValue;
      } else if (element instanceof microflows.LoopedActivity) {
        item.childObjectIds = element.objectCollection.objects.map(child => child.id);
        item.loopSourceType = element.loopSource.structureTypeName;
        if (element.loopSource instanceof microflows.IterableList) {
          item.listVariable = element.loopSource.listVariableName;
          item.iteratorVariable = element.loopSource.variableName;
        }
      } else if (element instanceof microflows.MicroflowParameterObject) {
        item.name = element.name;
        item.dataType = element.variableType.structureTypeName;
      } else if (element instanceof microflows.Annotation) {
        item.caption = element.caption;
      }
      objects.push(item);
    });
    const connections = flow.flows.map(connection => ({
      id: connection.id,
      type: connection.structureTypeName,
      from: connection.origin.id,
      to: connection.destination.id,
      ...(connection instanceof microflows.SequenceFlow ? {
        isErrorHandler: connection.isErrorHandler,
        cases: connection.caseValues.map(value => ({
          type: value.structureTypeName,
          ...(value instanceof microflows.EnumerationCase ? { value: value.value } : {})
        }))
      } : {})
    }));
    const result = {
      name: flow.qualifiedName,
      documentation: flow.documentation,
      note: "Partial model inspection. Includes selected action settings, branch cases, and loop membership. Other action types, retrieve sorting/range settings, and called microflow bodies are not fully expanded. This is not a complete behavioral explanation.",
      objects,
      connections
    };
    console.log(process.env.MENDIX_OUTPUT === "json"
      ? "MENDIX_RESULT:" + JSON.stringify(result)
      : JSON.stringify(result, null, 2));
  } finally {
    await model.closeConnection();
  }
}

main().catch(() => {
  console.error("Inspection failed. Check your configuration, token permissions, app version compatibility, and network access. No repository commit was requested.");
  process.exitCode = 1;
});
