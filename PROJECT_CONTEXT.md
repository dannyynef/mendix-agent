# Mendix Agent — project context and handoff

This document preserves the decisions and verified results from the project conversation. It accompanies the source snapshot saved to this repository. The source repository is separate from the Mendix app model on Team Server.

## Goal

Build reusable Mendix development tools that an AI coding agent can use to explain applications and make model changes. The user wants broad capabilities, including creating complete microflows and pages, rather than tools hardcoded to one business operation.

## Environment

- Local project folder: C:\Users\dannynef\Mendix-Agent
- GitHub repository: https://github.com/dannyynef/mendix-agent (private).
- Target Mendix Studio Pro version: 10.24.9.
- Practice app is stored on Mendix Team Server.
- Development branch used for app edits: agent-practice.
- The agent's source repository is separate from the Mendix app's Team Server repository.

## Architecture

Codex acts as the conversational agent. A local stdio MCP server exposes tools implemented with the Mendix Platform SDK and Model SDK. These tools create online working copies from Team Server, inspect or edit the model, and may commit approved changes back to the development branch. Studio Pro receives committed changes through pull/update; this is not the built-in Studio Pro MCP server.

The MCP server launches fixed child scripts without a shell and captures SDK logging so that stdout remains valid MCP protocol output. Tool responses explicitly describe incomplete inspection and uncertain commit outcomes.

## Credentials and configuration

Local .env contains MENDIX_TOKEN, MENDIX_APP_ID, and MENDIX_BRANCH. Optional MENDIX_WRITE_BRANCH selects the allowed editing branch; the default is agent-practice. Main/master/trunk edits are blocked by the write policy.

Never commit .env, tokens, user-specific Codex settings, node_modules, logs, or local session history. Use .env.example with empty credential values. Do not put tokens in MCP tool arguments or conversation notes.

## Verified milestones

- Connected to the practice app with the SDK and listed its microflows.
- Inspected MyFirstModule.SE_CheckDueEvents and MyFirstModule.SUB_StartEvent.
- The user compared the agent's explanation with Studio Pro and confirmed that it matched.
- Updated microflow documentation through the MCP tool on agent-practice; the user confirmed the documentation changed in Studio Pro.
- MCP startup/handshake and tool-discovery tests passed in earlier development sessions.
- Reusable decision-expression editing was implemented and passed local policy tests. Live behavior of a decision edit has not been confirmed in this conversation.

## Last observed source capabilities

The most recent successful source inspection showed these MCP tools:
- list_microflows
- inspect_microflow
- update_microflow_documentation
- update_decision_expression
- list_model_units
- inspect_model_unit
- edit_model_properties
- list_element_creation_types
- create_model_element
- delete_model_element

The broader tools inspect model units and supported properties, edit scalar properties, and create/delete a limited set of contained elements. They do not establish support for creating complete microflow or page documents. Re-read the actual source before relying on this inventory.

A previous project-specific add_start_event_due_check tool was replaced with update_decision_expression. Do not reintroduce hardcoded business-operation tools.

## Example app behavior that was inspected

SE_CheckDueEvents retrieves pending ScheduledItem records with StartAt at or before current time, loops over the retrieved list, and calls SUB_StartEvent.

SUB_StartEvent checks Pending status. On its true branch it changes Status to Started, sets TriggeredAt to current time, sets ResultMessage to 'Event action executed', and commits. The other branch ends without changes.

An optional proposed enhancement was to require a nonempty, due StartAt inside SUB_StartEvent itself. This was a sample use case for a generic decision editor, not the product's scope. Do not assume that enhancement was applied.

## Current unfinished work

1. Add reusable creation of complete microflows, activities/connections, parameters, and pages, including layouts and widgets.
2. Evaluate existing Mendix tooling before writing every editing operation from scratch.
3. Add model consistency and meaningful behavioral validation. Local TypeScript/policy checks do not prove a model is valid in Studio Pro or behaves correctly at runtime.

### mxcli evaluation — 2026-11-10

Pinned mxcli v0.31.0 Windows amd64 was downloaded and its release SHA-256 verified. An isolated local copy of ScheduledActionsLab agent-practice (10.24.9.81004) was created under `.local/mxcli-evaluation/ScheduledActionsLab`. The original app checkout remained clean; no Team Server commit was made.

mxcli successfully listed the existing microflows, checked and created a complete Boolean-parameter microflow with an exclusive decision, logging actions and returns, and described it back. The installed Mendix 10.24.9 `mx check` reported zero errors after copying the supporting widget/theme assets into the isolated copy. The initial experiment did not include Studio Pro review or runtime execution; subsequent results are recorded below. See `evaluation/mxcli/README.md` and `branch-probe.mdl` for evidence, limitations and the next checks. Do not treat this narrow result as proof of page support or general compatibility.

Follow-up: user confirmed the probe opened in Studio Pro after transfer to the local agent-practice checkout (commit `99ac64b`; terminal push authentication failed). Subsequent disposable-copy runtime tests on exact Mendix 10.24.9.81004 passed both true/false return assertions and produced both expected log messages. A simple page `MyFirstModule.MxcliProbePage` was created in the disposable copy and included in the successful runtime build. Mendix consistency checks remained at zero errors after test cleanup. Page visual/interaction review is outstanding; no page transfer to agent-practice was made. Test source, page MDL and JUnit evidence are in `evaluation/mxcli/`. User prohibits desktop control; use terminal and connected tools only.

## Research findings

These are documentation findings, not installation/test results on the practice app:

- Mendix Labs mxcli: https://github.com/mendixlabs/mxcli
  - Textual MDL-based app inspection and editing, including microflows and pages.
  - Compatibility documentation lists Mendix 10.24 support: https://www.mxcli.org/appendixes/version-compatibility.html
  - The inspected nightly workflow tested 10.24.24 rather than exact 10.24.9: https://github.com/mendixlabs/mxcli/blob/main/.github/workflows/nightly.yml
  - README labels it alpha and requires closing the app in Studio Pro before file-based edits. Test a pinned version against a disposable copy.

- Community Studio Pro extension / pymx:
  - https://marketplace.mendix.com/link/component/244441/Mendix/extension-mcp-server
  - https://github.com/engalar/MendixExtensionPython
  - Marketplace releases were built for 10.24.1/10.24.2 and advertise microflow/page creation. Compatibility with 10.24.9 is plausible but not verified.

- Experimental 84-tool MCP for Studio Pro:
  - https://marketplace.mendix.com/link/component/258524/Mendix/MCP-for-Studio-Pro
  - Requires 10.24.13+, newer than the user's version. Page editing is limited to overview-page generation; nanoflows/workflows are read-only.

- MendixToolkit: https://github.com/jordnlvr/MendixToolkit
  - Reference for inspection, conversational execution, reviews and testing; documented integration targets Claude Code/newer Studio Pro configurations.

- Official Studio Pro MCP server:
  - https://docs.mendix.com/refguide/studio-pro-mcp-server/
  - Introduced in 11.10, unavailable in the user's 10.24.9.
  - Do not confuse it with the runtime MCP module, which exposes application business logic and is not an application-model editor.

## Working preferences

- Progress autonomously and batch substantive changes instead of repeatedly asking the user to perform tiny steps.
- Explain what changed and why, while clearly separating implementation, local tests, and live Mendix verification.
- Preserve the current Mendix version unless the user authorizes an upgrade.
- Do not use a browser; the user explicitly requested this.
- PowerShell blocks npm.ps1 on the user's machine; use npm.cmd.
- Local shell/file access has intermittently hung or timed out. Do not report unreturned commands as successful.

## Resume checklist

Read README.md, package.json, src/, scripts/, and any applicable AGENTS.md. Inspect Git status/remotes before initialization or pushing. Confirm .env is ignored and not tracked. Preserve remote history, avoid force-pushes, run the real checks, and update this document with actual results.
