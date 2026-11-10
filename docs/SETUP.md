# User setup

## 1. Requirements

| Requirement | Needed for |
| --- | --- |
| GitHub access to this private repository; Git to clone | Obtaining source and instructions |
| An AI assistant with local terminal access OR a client supporting local stdio MCP servers | Executing tools |
| Node.js 24 or newer and npm | Running this MCP server and its current tests |
| Permission to an existing Mendix app and development branch | Inspecting/editing the target app |
| A Mendix personal access token with the scopes required by Platform/Model SDK operations | Online MCP/SDK path |
| A local app checkout including MPR, mprcontents and supporting assets | mxcli path |
| A pinned mxcli executable for your operating system | Complete page/microflow creation |
| The matching Mendix Studio Pro/toolset | Exact-version model checks and visual review |
| Java/build dependencies and a scratch test database/runtime when running behavioral tests | Runtime testing |

Node 24 is the documented baseline, not a claim that every later release is tested. Recorded app experiments used Mendix 10.24.9.81004 and mxcli v0.31.0 on Windows amd64. MCP clients differ: consult your client's current instructions for adding a local stdio server. A plain chat session with no execution tools cannot modify Mendix through a URL.

Do not upgrade a Mendix app just to complete setup. Verify compatibility on a copy.

## 2. Get the tool repository

Clone using your normal authenticated GitHub account, then install the locked dependencies:

```sh
git clone https://github.com/dannyynef/mendix-agent.git
cd mendix-agent
npm ci
npm test
```

On Windows PowerShell, use `npm.cmd ci` and `npm.cmd test` if execution policy blocks npm.ps1. These tests validate TypeScript, editing policies, offline fixtures and MCP startup/discovery; they do not connect to your Mendix app.

This source checkout and your Mendix app checkout must remain separate.

## 3. Prepare your Mendix app

1. Open the existing app in its matching Studio Pro version.
2. Create/select a development branch using your normal Team Server workflow.
3. Save changes and confirm the target app and branch. Back up or commit your work.
4. For local mxcli edits, close the app in Studio Pro. A full disposable copy is recommended for the first experiment.
5. Keep the MPR together with mprcontents, widgets, theme/themesource, resources, Java sources and other project assets. Copying only the MPR is insufficient for a split-format app.

The MCP write policy defaults to `agent-practice`. You can use a different development branch by setting both branch variables below to the same exact name. Main/master/trunk are blocked.

## 4. Configure the online SDK/MCP path

Copy `.env.example` to `.env` in the tool repository. Enter values **locally in an editor**, not in chat:

```dotenv
MENDIX_TOKEN=<your Mendix personal access token>
MENDIX_APP_ID=<your app ID>
MENDIX_BRANCH=<your development branch>
MENDIX_WRITE_BRANCH=<the same development branch>
```

The angle-bracket values are placeholders. The real .env must remain ignored and untracked. Do not include it in screenshots or support messages.

Create the token using [Mendix's PAT instructions](https://docs.mendix.com/apidocs-mxsdk/mxsdk/set-up-your-pat/) and grant only the scopes needed for the existing app and intended SDK operations. Your user must also have app/branch access. Do not use an OpenAI key for MENDIX_TOKEN.

Run the first read-only smoke check from the repository:

```sh
npm run list
```

Windows: `npm.cmd run list`. This creates a temporary online working copy and lists microflows; it does not commit app changes. If it fails, resolve token scopes, app access, exact branch, network and SDK/version compatibility before editing.

## 5. Connect an AI client through MCP

The launch contract is:

- Transport: **stdio**
- Command: the absolute path to your Node executable (or `node` if the client inherits a working PATH)
- Arguments: one absolute path to `src/mcp-server.mjs`
- Working directory: the repository, if the client requests one
- Suggested tool timeout: 180 seconds (the server's child timeout is 120 seconds)
- Credentials: server-side local .env, never pasted into the client prompt

See [mcp-client.example.json](../mcp-client.example.json) for a common JSON shape. Some clients use different keys or a settings UI: translate the command/arguments above to your client's format. Replace every example path. The existing [Codex TOML example](../codex-mcp.example.toml) illustrates that client's table format; its paths must also be replaced.

Start Node directly for stdio MCP, rather than launching through npm, whose extra output can interfere with protocol messages. The server resolves .env relative to its own repository.

Reload/restart your AI client if required, then ask it to list the server's tools. Expect the 10 names in [Capabilities](CAPABILITIES.md). First ask it to list microflows and inspect one exact name. A missing tool list means MCP setup is incomplete.

## 6. Set up the terminal/mxcli path

mxcli is a separate open-source tool from [mendixlabs/mxcli](https://github.com/mendixlabs/mxcli). Read its release notes and obtain the correct binary from [releases](https://github.com/mendixlabs/mxcli/releases). Pin a version and verify the published SHA-256 rather than silently installing a moving nightly build.

Our Windows amd64 experiment used:

- Version: **v0.31.0**
- Asset: `mxcli-windows-amd64.exe`
- SHA-256: `0a63a7884e91947765370a4111420676ac0121565d233c7cacd480f2f79ed6d1`

That hash is only for that exact asset/version. Do not use it for other operating systems or releases. Store the executable in a local ignored location or your normal tools directory. No credential is needed just to edit an already available local app copy; obtaining/pushing the checkout still requires Team Server access.

In a terminal, replace the executable/project paths with your own:

```powershell
& 'C:\tools\mxcli.exe' --version
& 'C:\tools\mxcli.exe' -p 'C:\apps\MyApp\MyApp.mpr' -c 'LIST MICROFLOWS;'
& 'C:\tools\mxcli.exe' syntax microflow.create
& 'C:\tools\mxcli.exe' syntax page.create
```

Have the assistant follow [Workflow](WORKFLOW.md) for writes. mxcli is not a command you can call through this repository's existing MCP tools; the assistant needs terminal access for this path.

## 7. First change and publishing

Start with a small change on a disposable app copy. Inspect existing names, show the proposed MDL or MCP preview, validate, apply within authorization, run the exact-version checker and test behavior. Then repeat against the intended development branch if appropriate.

For local mxcli edits, reopen the app in Studio Pro after editing, inspect the Errors pane and review the result. Commit/push through the authorized terminal or Studio Pro workflow. SDK apply tools already commit their supported changes to Team Server; pull/update Studio Pro afterward.

GitHub holds the tool source. Team Server holds the Mendix app. A GitHub source push does not publish an app model. A local app commit is not a Team Server push. Git authentication may require the user to complete setup outside the AI session.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Cannot clone/read repository | Private repo permissions and the AI integration's GitHub authorization |
| No MCP tools appear | Absolute Node/server paths, stdio configuration, restart, `npm run test:mcp` |
| SDK inspection fails | Local .env, token scopes/app membership, app ID, branch, network, version compatibility |
| Write branch rejected | Exact matching MENDIX_BRANCH/MENDIX_WRITE_BRANCH; use a development branch |
| mxcli cannot parse MDL | Use the pinned executable's `syntax` and `check`; examples may differ by release |
| Missing widgets/theme errors | Use a full app copy with supporting assets |
| CE0463 widget definition changed | Test `mxcli fix widgets` with the matching `mx` binary on a copy; inspect the resulting diff |
| Git shows all mxunit files deleted | Stop before commit; a tool may have collapsed MPR v2 to v1. Preserve work and restore/reapply on a copy using format-preserving tools |
| No automatic scheduled changes | Runtime must be running with scheduled events enabled; verify scheduler cadence and actual persisted state |
| Commit failed/timed out | Inspect current model and remote history before retrying; do not assume no change occurred |
| Git cannot authenticate | Configure GitHub and Team Server authentication separately; never paste credentials in chat |

For help, share sanitized command/error text, OS, tool versions, branch name and the operation attempted. Exclude tokens, .env and confidential model data.
