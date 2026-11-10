import { readFile, readdir, lstat } from "node:fs/promises";
import { resolve, relative, join } from "node:path";

// Inspect only the source/configuration files we intend to publish. Never print
// secret values. The local token is used only for an exact-match exclusion check.
const root = resolve(import.meta.dirname, "..");
const roots = ["src", "scripts", "evaluation", "docs", "AGENTS.md", "mcp-client.example.json", "README.md", "PROJECT_CONTEXT.md", "package.json", "package-lock.json", "tsconfig.json", ".gitignore", ".env.example", "codex-mcp.example.toml"];
const files = [];
async function collect(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error("Refusing to publish symbolic links.");
  if (stat.isDirectory()) {
    for (const name of (await readdir(path)).sort()) await collect(join(path, name));
  } else files.push(path);
}
for (const entry of roots) {
  try { await collect(resolve(root, entry)); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
let token = "";
try {
  const env = await readFile(resolve(root, ".env"), "utf8");
  token = env.match(/^\s*MENDIX_TOKEN\s*=\s*(.*?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, "") || "";
} catch (error) { if (error.code !== "ENOENT") throw error; }
const entries = [];
const flagged = [];
for (const path of files) {
  const content = await readFile(path, "utf8");
  const name = relative(root, path).replaceAll("\\", "/");
  if ((token.length >= 8 && content.includes(token)) ||
      /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\bmxtoken:[A-Za-z0-9_-]{15,})/.test(content)) flagged.push(name);
  entries.push({ path: name, mode: "100644", type: "blob", content });
}
if (flagged.length) {
  console.error("Potential credentials found in: " + flagged.join(", "));
  process.exitCode = 1;
} else if (process.argv.includes("--export")) {
  console.log(JSON.stringify({ entries }));
} else {
  console.log(`Checked ${files.length} repository files. No configured Mendix token or recognized credential patterns found.`);
}
