import { MendixPlatformClient } from "mendixplatformsdk";
import { validateDocumentationRequest, checkExpectedDocumentation } from "./documentation-policy.js";

async function main(): Promise<void> {
  let payload = "";
  for await (const chunk of process.stdin) {
    payload += chunk.toString();
    if (payload.length > 100000) throw new Error("Request too large.");
  }
  const branch = process.env.MENDIX_BRANCH?.trim();
  const request = validateDocumentationRequest(branch, JSON.parse(payload));
  const appId = process.env.MENDIX_APP_ID?.trim();
  if (!appId || !process.env.MENDIX_TOKEN?.trim()) throw new Error("Missing configuration.");
  const app = new MendixPlatformClient().getApp(appId);
  const workingCopy = await app.createTemporaryWorkingCopy(branch!);
  const model = await workingCopy.openModel();
  try {
    const reference = model.allMicroflows().find(flow => flow.qualifiedName === request.name);
    if (!reference) throw new Error("Microflow not found.");
    const flow = await reference.load();
    const before = flow.documentation;
    const result = {
      appId, branch, name: request.name,
      before, after: request.documentation,
      changed: before !== request.documentation,
      mode: request.mode,
      committed: false,
      commitMessage: `Document ${request.name} via Mendix Agent`
    };
    if (request.mode === "apply") {
      checkExpectedDocumentation(before, request.expectedDocumentation!);
      if (result.changed) {
        flow.documentation = request.documentation;
        await model.flushChanges();
        await workingCopy.commitToRepository(branch!, { commitMessage: result.commitMessage });
        result.committed = true;
      }
    }
    console.log("MENDIX_RESULT:" + JSON.stringify(result));
  } finally {
    // Preserve a completed commit's result if closing the connection fails.
    await model.closeConnection().catch(() => undefined);
  }
}

main().catch(() => {
  console.log("MENDIX_RESULT:" + JSON.stringify({
    error: "Documentation request failed. Check the configured development branch, app access, microflow name, and expected documentation. If apply was requested, check Team Server history and inspect the current documentation before retrying: a network failure can leave the commit outcome unknown."
  }));
  process.exitCode = 0;
});
