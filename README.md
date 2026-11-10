# Mendix Agent learning project

Target app version: Studio Pro 10.24.9. First milestone: list microflows from a practice app on Mendix Team Server.

## Setup

1. Install the SDK dependencies with `npm install mendixplatformsdk mendixmodelsdk`, then the development tools with `npm install --save-dev typescript tsx @types/node`. These commands populate package.json and create a lockfile. After that, future installs can use `npm install`.
2. Copy `.env.example` to `.env` and fill in the token, App ID, and exact branch name locally. Do not share the token or commit `.env`.
3. Run `npm run check`, then `npm run list`.

The list command creates a temporary online working copy and reads microflow names. It does not modify model documents or commit changes to Team Server. Mendix automatically removes temporary working copies after 24 hours.

Authentication uses a Mendix personal access token via `MENDIX_TOKEN`. See https://docs.mendix.com/apidocs-mxsdk/mxsdk/set-up-your-pat/ . Use the permissions needed for your existing practice app; this project does not create or delete apps.

Actual SDK compatibility with the 10.24.9 app will be checked on first connection. Do not upgrade your app to resolve an SDK error without reviewing the cause.

## Learning milestones

Inspect one microflow with `npm.cmd run inspect -- MyFirstModule.MyFirstLogic`. This prints a structural JSON summary, including nested objects, loop membership, expression decisions, branch case values, database retrieve filters, object changes, microflow call arguments, and connections. It does not expand all action settings, retrieve sorting/range settings, or called microflows and is not yet a complete explanation of behavior. It creates a temporary working copy but does not edit model documents or commit to Team Server.

1. Connect and list microflows.
2. Inspect one microflow and its activities.
3. Give an AI agent inspection tools and ask it to explain the flow.
4. Add one model-editing tool and verify a small change on a development branch.

## Local MCP integration

`update_decision_expression` accepts any qualified microflow name, an expression decision ID from inspection, and a proposed Mendix expression. It is not tied to this project's microflows, attributes, or expressions. This replaces the earlier project-specific due-check tool.

Restart Codex to load the tool. Example: "Inspect SUB_StartEvent and preview changing its Pending decision to also require a nonempty StartAt at or before current time. Use update_decision_expression and show the exact change."

Preview returns app ID, branch, microflow name, decision ID, before/after expressions, and outgoing branch cases. Apply requires `expectedExpression` equal to `preview.before`. It updates only the selected expression, flushes, and commits without force. Stale expressions and missing/non-expression decision IDs are rejected. An unchanged expression creates no new commit. The tool does not add activities or rewire branches. It does not validate expression syntax, model references, or runtime behavior: inspect the relevant context and verify consistency and behavior in Studio Pro.

Run `npm.cmd run test:decision` for preview/no-write behavior, branch restrictions, stale/incorrect targets, apply order, no-op behavior, commit prevention after a flush failure, and edits to different microflow names. These tests do not execute Mendix expressions.

### Verify the due-time guard in Studio Pro

Pull agent-practice, open SUB_StartEvent, and check the decision expression and the Errors pane. Use an existing practice page or a temporary test microflow to call SUB_StartEvent directly with a ScheduledItem parameter. Calling SE_CheckDueEvents alone cannot verify this change because its retrieve already excludes future events.

| Status before call | StartAt | Expected after a direct call |
| --- | --- | --- |
| Pending | Past | Started; TriggeredAt and ResultMessage updated |
| Pending | Current time | Started (set StartAt immediately before invoking the subflow) |
| Pending | Future | All three fields unchanged |
| Pending | Empty | All three fields unchanged |
| Started | Past | All three fields unchanged; TriggeredAt is not overwritten |

Use separate test records and record their original Status, TriggeredAt, and ResultMessage. Check values after retrieving committed objects again. Runtime testing and Studio Pro consistency checks must be performed before merging the branch. This tool has not been live-tested merely because the local tests pass.

Install the MCP adapter dependencies with `npm.cmd install @modelcontextprotocol/sdk@1 zod@3`. The adapter uses the v1 SDK API documented at https://ts.sdk.modelcontextprotocol.io/server .

Run `npm.cmd run check` and `npm.cmd run test:mcp`. The MCP smoke test checks startup, protocol handshake, and tool discovery without reading .env or calling Mendix. Live tool calls still require the local configuration and Team Server access.

The server exposes `list_microflows`, `inspect_microflow`, `update_microflow_documentation`, and `update_decision_expression`. Each tool runs a fixed script in a child process, captures its logs, and returns a structured result. Requests are serialized and each child has a two-minute timeout. Each successful connection creates another temporary online working copy. Inspection tools do not edit models or commit changes. Editing tools can commit after preview.

## First editing tool

Set `MENDIX_BRANCH=agent-practice` in the local .env file. Both editing tools use that development branch by default. To use another development branch, set both `MENDIX_BRANCH` and `MENDIX_WRITE_BRANCH` to its exact name. Main/master/trunk edits remain blocked. To select another project, change `MENDIX_APP_ID` and use a token with access, then verify SDK/version compatibility. Restart Codex after changing tool definitions.

Ask Codex to inspect `MyFirstModule.SE_CheckDueEvents`, then call `update_microflow_documentation` with `mode=preview` and proposed documentation. The preview returns the app ID, branch, name, and exact before/after text. It does not assign the documentation or commit. Review that text. When you ask Codex to apply it, it calls the same tool with `mode=apply` and `expectedDocumentation` equal to the preview's `before` value. Apply rejects changed documentation, updates only the documentation field, flushes the model, and commits to agent-practice. It does not force a commit. No change means no new commit.

After applying, pull agent-practice into Studio Pro and review the microflow's Documentation property and Team Server history. The tool does not edit executable microflow activities. If an apply call times out or fails, inspect current documentation and history before retrying: the remote commit may have succeeded without returning a response.

Run `npm.cmd run test:documentation` for branch and stale-documentation checks without connecting to Mendix. The documentation write path was verified in the practice app. The decision write path still needs live verification. Keep the app in Studio Pro 10.24.9; do not upgrade it automatically if an SDK operation fails.

After testing, use `codex-mcp.example.toml` as the configuration example. It has not been added to your Codex settings automatically. Codex starts `node src/mcp-server.mjs` directly; avoid launching it through npm for stdio MCP, since npm's extra output can interfere with protocol messages. The server locates .env relative to this project, independently of Codex's working directory.

Once connected, ask: "Use the Mendix tools to explain MyFirstModule.SE_CheckDueEvents and the microflows it calls. State what the inspection output cannot establish."

The MCP adapter lets an existing agent use the inspection tools. It is not a separate AI model and does not require an OpenAI API key. The original terminal commands remain available.

## General model inspection and property editing

The original four MCP tools remain available. Three additional tools provide a reusable foundation across document types:

- `list_model_units`: discover unit IDs, exact SDK structure types, parent IDs, loadability, read-only status, and available scalar metadata. Optional `type` filters by exact structure type, for example `Pages$Page` (use the actual value returned by discovery).
- `inspect_model_unit`: pass a discovered `unitId` to load and inspect that unit. Returns contained element IDs, parent IDs, property names/kinds, scalar values, reference IDs, enum names, and `editable` flags. References are summarized rather than recursively loaded; unsupported object values are marked omitted. Structural child units should be inspected separately by their own IDs.
- `edit_model_properties`: preview or apply up to 100 string, finite-number, or boolean property changes within one unit. Use only inspected properties marked editable. This property-editing tool does not change references, enums, lists, or containment. Separate creation/deletion tools are described below.

Example request (replace IDs and property with values from inspection):

```json
{
  "unitId": "unit-id-from-discovery",
  "mode": "preview",
  "changes": [
    { "elementId": "element-id-from-inspection", "property": "caption", "value": "Review order" }
  ]
}
```

The result includes app ID, branch, and a `result` containing each target's type and exact before/after values. To apply the reviewed changes, send the same request with `mode: "apply"` and each change's `expectedValue` set to its preview `before`. All targets, types, and expected values are checked before assignment. Duplicate targets, read-only units, unavailable properties, and stale values are rejected. Changed batches flush once and commit once without force; unchanged batches create no commit. Preview uses the same development-branch restrictions as apply.

A batch is confined to a disposable working copy until commit. Setter or flush failures prevent the commit call, but failures during commit can leave the remote outcome unknown. Inspect current values and Team Server history before retrying. Expected values detect changes to the edited properties, not every dependency or an entire branch revision. SDK commit conflict handling still applies.

These tools expose model structure rather than a complete behavioral explanation. Scalar editing does not validate Mendix expressions, rename dependencies, model consistency, or runtime behavior. Review the Errors pane and test in Studio Pro 10.24.9 before merging. No live Team Server edits were made while implementing these tools.

Run `npm.cmd test` for type-checking, existing policy tests, model editor tests, and MCP discovery. `test:model` uses detached property fixtures with the installed SDK's primitive-property prototype; it verifies local orchestration, not SDK transport or remote persistence. Live SDK/version compatibility and remote writes still require separate verification. Restart the MCP client to load the additional tool definitions.

## Create and delete contained elements

Three additional MCP tools preserve all existing tools:

- `list_element_creation_types` returns the exact supported SDK type names, container types, and containment list names without connecting to Mendix or reading `.env`.
- `create_model_element` creates one element in an inspected container using SDK defaults and optional initial scalar properties. Supported types currently include domain model entities, attributes and annotations, plus microflow annotations, action activities, exclusive splits, start/end events, loops, and parameter objects. It does not create units, pages, modules, arbitrary widget types, graph connections, or references.
- `delete_model_element` deletes an inspected contained element and its descendants through SDK `delete()`. Unit roots and elements occupying required single containment slots are rejected. Deletion preview includes the serialized subtree and descendant IDs. SDK reference cleanup can affect references outside that subtree; the preview is not a complete impact analysis of the app.

Inspect the unit first to find the container ID. For microflow objects this is the `MicroflowObjectCollection` ID, rather than the microflow unit ID. Discover exact type strings with `list_element_creation_types`. Example creation:

```json
{
  "unitId": "unit-id-from-discovery",
  "containerId": "collection-id-from-inspection",
  "type": "Microflows$Annotation",
  "properties": { "caption": "Review this step" },
  "mode": "preview"
}
```

Preview constructs a detached SDK object to check defaults, version support, and initial scalar properties. It never attaches the draft, flushes, deletes, or commits. IDs inside the preview's `details.defaults` belong to a temporary draft; apply generates new IDs. The apply result's `details.createdElementId` is the actual created element ID. Creation is limited to explicitly registered SDK types with checked parent classes and available containment lists; it cannot replace an existing single-valued child.

Example deletion:

```json
{
  "unitId": "unit-id-from-discovery",
  "elementId": "element-id-from-inspection",
  "mode": "preview"
}
```

For either operation, review the returned `result.details`, then resend the same request with `mode: "apply"` and `expectedFingerprint` equal to `result.fingerprint`. The SHA-256 fingerprint covers the containing unit's serialized content. Apply rejects any intervening change to that unit, performs the operation, flushes, and commits once without force on the configured development branch. It does not detect changes in other units or guarantee global model consistency. A failure before commit prevents a commit call; a failure during commit can leave its outcome unknown. Inspect the model and Team Server history before retrying an uncertain apply.

SDK defaults may need additional configuration: for example an action activity requires an appropriate action, and a new graph object needs connections before it becomes useful. Scalar fields can be configured with `edit_model_properties`; references and graph wiring remain unsupported. Check the Studio Pro Errors pane and behavior before merging. These new operations have not been live-tested against Team Server.

`npm.cmd run test:elements` checks real SDK detached constructors/defaults for every catalog entry, previews without attachment/deletion/flush/commit, scalar initialization, container validation, stale fingerprints, required-slot restrictions, read-only and branch policies, subtree previews, operation ordering, and flush/commit failures. Attachment/deletion and transport use offline fixtures. `npm.cmd test` also verifies existing tools and MCP discovery and calls the creation catalog through MCP without credentials. Restart the MCP client to load the three new tools.

