import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "mendix-agent-smoke-test", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL("../src/mcp-server.mjs", import.meta.url))],
  stderr: "pipe"
});
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), ["create_model_element", "delete_model_element", "edit_model_properties", "inspect_microflow", "inspect_model_unit", "list_element_creation_types", "list_microflows", "list_model_units", "update_decision_expression", "update_microflow_documentation"]);
  const inspect = tools.find(tool => tool.name === "inspect_microflow");
  assert.ok(inspect.inputSchema.required.includes("name"));
  const update = tools.find(tool => tool.name === "update_microflow_documentation");
  assert.equal(update.annotations.readOnlyHint, false);
  assert.equal(update.inputSchema.properties.mode.default, "preview");
  const decision = tools.find(tool => tool.name === "update_decision_expression");
  assert.equal(decision.annotations.readOnlyHint, false);
  assert.equal(decision.inputSchema.properties.mode.default, "preview");
  for (const key of ["name", "decisionId", "expression"]) assert.ok(decision.inputSchema.required.includes(key));
  const edit = tools.find(tool => tool.name === "edit_model_properties");
  assert.equal(edit.inputSchema.properties.mode.default, "preview");
  assert.ok(edit.inputSchema.required.includes("changes"));
  for (const name of ["create_model_element", "delete_model_element"]) {
    const tool = tools.find(t => t.name === name);
    assert.equal(tool.annotations.destructiveHint, true);
    assert.equal(tool.inputSchema.properties.mode.default, "preview");
    assert.ok(tool.inputSchema.required.includes("unitId"));
    const invalid = await client.callTool({ name, arguments: { unitId: "test", mode: "invalid" } });
    assert.equal(invalid.isError, true);
  }
  const catalog = await client.callTool({ name: "list_element_creation_types", arguments: {} });
  assert.ok(!catalog.isError);
  const types = JSON.parse(catalog.content[0].text).creationTypes;
  assert.ok(types.some(t => t.type === "DomainModels$Entity"));
  assert.ok(types.every(t => t.containerType && t.property));
  console.log("MCP handshake and tool discovery passed. No Mendix connection or token was used.");
} finally {
  await client.close();
}

