import { MendixPlatformClient } from "mendixplatformsdk";
import { type IModelUnit } from "mendixmodelsdk";
import { describeUnit, inspectUnit, executeModelEdit, validateEditRequest } from "./model-editor.ts";
import { creationCapabilities, executeElementOperation, validateElementRequest } from "./element-editor.ts";

async function main() {
  const command = process.argv[2];
  if (command === "capabilities") {
    console.log("MENDIX_RESULT:" + JSON.stringify({ creationTypes: creationCapabilities() }));
    return;
  }
  if (!["list", "inspect", "edit", "create", "delete"].includes(command)) throw new Error("Invalid command.");
  let payload = "";
  for await (const chunk of process.stdin) {
    payload += chunk.toString();
    if (payload.length > 3_000_000) throw new Error("Request too large.");
  }
  const input = JSON.parse(payload || "{}");
  const branch = process.env.MENDIX_BRANCH?.trim();
  const appId = process.env.MENDIX_APP_ID?.trim();
  if (command === "edit") validateEditRequest(branch, input);
  if (command === "create" || command === "delete") validateElementRequest(branch, command, input);
  if (!branch || !appId || !process.env.MENDIX_TOKEN?.trim()) throw new Error("Missing configuration.");
  const copy = await new MendixPlatformClient().getApp(appId).createTemporaryWorkingCopy(branch);
  const model = await copy.openModel();
  try {
    let result: unknown;
    if (command === "list") {
      const units = model.allUnits().filter(u => !input.type || u.structureTypeName === input.type);
      result = { units: units.map(describeUnit).sort((a, b) => a.id.localeCompare(b.id)) };
    } else {
      const reference = model.allUnits().find(u => u.id === input.unitId);
      if (!reference || !reference.isLoadable) throw new Error("Unit not found or not loadable.");
      const unit = "load" in reference ? await (reference as IModelUnit).load() : reference;
      const operations = {
        flush: () => model.flushChanges(),
        commit: () => copy.commitToRepository(branch, { commitMessage: `${command} model elements in ${reference.id}` })
      };
      result = command === "inspect" ? inspectUnit(unit as typeof reference)
        : command === "create" || command === "delete"
          ? await executeElementOperation(unit as typeof reference, branch, command, input, operations)
          : await executeModelEdit(unit as typeof reference, branch, input, operations);
    }
    console.log("MENDIX_RESULT:" + JSON.stringify({ appId, branch, result }));
  } finally { await model.closeConnection().catch(() => undefined); }
}
main().catch(() => console.log("MENDIX_RESULT:" + JSON.stringify({ error:
  "Model request failed. Check configuration, unit/element IDs, property types, development branch, and expected values. After an apply failure inspect the model and Team Server history before retrying; commit outcome may be unknown." })));
