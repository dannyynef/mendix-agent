import { MendixPlatformClient } from "mendixplatformsdk";

async function main(): Promise<void> {
  const appId = process.env.MENDIX_APP_ID?.trim();
  const branch = process.env.MENDIX_BRANCH?.trim();
  if (!process.env.MENDIX_TOKEN?.trim() || !appId || !branch) {
    throw new Error("Set MENDIX_TOKEN, MENDIX_APP_ID, and MENDIX_BRANCH in your local .env file.");
  }

  const client = new MendixPlatformClient();
  const app = client.getApp(appId);
  console.log("Creating a temporary online working copy of the selected branch...");
  const workingCopy = await app.createTemporaryWorkingCopy(branch);
  const model = await workingCopy.openModel();
  try {
    const names = model.allMicroflows().map(flow => flow.qualifiedName).sort();
    if (process.env.MENDIX_OUTPUT === "json") {
      console.log("MENDIX_RESULT:" + JSON.stringify({ microflows: names }));
      return;
    }
    console.log(`Found ${names.length} microflows:`);
    for (const name of names) console.log(name);
  } finally {
    await model.closeConnection();
  }
}

main().catch(() => {
  // Avoid dumping SDK responses that could contain sensitive request details.
  console.error("Could not list microflows. Check your local configuration, token permissions, branch name, and network access. SDK compatibility with the app version must also be verified on the first connection.");
  process.exitCode = 1;
});
