# Mendix Agent

Reusable tools and operating instructions that let AI coding assistants inspect and modify Mendix applications.

Give an assistant this repository and ask it to read [AGENTS.md](AGENTS.md). It can use the local stdio MCP server for Mendix SDK operations, or an independently installed mxcli executable for complete microflows and pages. The assistant must have tool execution access; reading a GitHub link alone does not install or connect anything.

## Start here

- **Users:** follow [Setup](docs/SETUP.md), including requirements, Mendix access, AI configuration and first-use checks.
- **AI assistants:** read [AGENTS.md](AGENTS.md), then [the operating workflow](docs/WORKFLOW.md).
- **Capabilities:** see [supported operations and limitations](docs/CAPABILITIES.md).
- **Detailed MCP contracts:** see [MCP reference](docs/MCP_REFERENCE.md).
- **Evidence:** see [mxcli evaluation](evaluation/mxcli/README.md). Examples belong to a practice app; they are not required to use these tools.

## What this repository provides

| Path | Use |
| --- | --- |
| `src/mcp-server.mjs` | Local MCP server with 10 inspection/editing tools backed by Mendix Platform/Model SDKs |
| `src/*policy.ts`, model/element editors | Development-branch restrictions, previews and stale-state checks |
| `docs/` and `AGENTS.md` | Setup and model-independent operating instructions |
| `evaluation/mxcli/` | Example MDL and recorded compatibility/runtime experiments |

This repository does not contain an AI model or a Mendix application. Your assistant supplies reasoning; these tools supply model access. No OpenAI API key is needed by the MCP server. Your chosen AI provider may have its own account/subscription requirements.

## Choose an execution path

**Default: work on local app files.** When you give an assistant this repository and ask it to help with a Mendix project, it should discover and inspect your local development checkout, then use terminal/mxcli tools for edits. It should preserve your Mendix version, require the app closed in Studio Pro before file edits, and validate changes on a disposable copy before applying them locally. If local access or tools are missing, it should help complete setup rather than silently edit Team Server. Team Server editing is an explicit alternative; pushing local changes requires your authorization. See [the agent instructions](AGENTS.md#default-to-the-local-app-checkout).

**MCP / online SDK:** configure a Mendix personal access token, app ID and development branch. The server creates temporary online working copies and can commit supported edits to Team Server. No local MPR is required for those tools.

**Terminal / mxcli:** install a pinned mxcli release and work on a local development checkout or disposable copy of your Mendix app. It can create complete microflows, pages and other model elements using MDL. mxcli is separate software; it is not bundled with this repository or exposed by its current MCP server. Studio Pro must have the target app closed during file edits.

## Verification and scope

The project's recorded end-to-end experiments used **Studio Pro 10.24.9.81004** and **mxcli v0.31.0 on Windows amd64**. Complete microflow creation, runtime Boolean-branch tests, and simple page creation/build checks passed. Other Mendix versions, operating systems, widgets and applications need their own compatibility checks.

Local SDK policy/MCP tests do not prove that every edited app is valid or works at runtime. Run the matching Mendix checker and meaningful behavioral tests for each app change.

## Share this with another assistant

> Use https://github.com/dannyynef/mendix-agent as the tool repository for my Mendix app. Read AGENTS.md, docs/SETUP.md and docs/CAPABILITIES.md. Default to my local app files: discover the existing development checkout, check terminal/mxcli access, help me complete setup, and start with read-only inspection. Ask for the local app path, Mendix version and development branch only if they are not available. Require the app closed in Studio Pro before editing its files. Keep changes local for review; do not switch to Team Server editing or push changes unless I authorize it. Never ask me to paste a token into chat. Before editing, show the concrete change and validation plan. Do not change my app version or operate my desktop.

The repository is currently private. Each person or AI integration needs permission to read/clone it. Sharing its URL does not grant repository or Mendix access.
