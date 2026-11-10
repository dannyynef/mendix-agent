export function assertWriteBranch(branch: string | undefined, allowedBranch = process.env.MENDIX_WRITE_BRANCH?.trim() || "agent-practice"): void {
  if (!branch || branch !== allowedBranch || ["main", "master", "trunk"].includes(branch.toLowerCase())) {
    throw new Error(`Select the configured development branch (${allowedBranch}) before editing. Main branches are not allowed.`);
  }
}
