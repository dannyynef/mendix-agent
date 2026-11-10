# Capabilities and boundaries

## Online SDK tools exposed by this MCP server

| Tool | Supported operation |
| --- | --- |
| list_microflows | List qualified microflow names |
| inspect_microflow | Inspect graph and supported action settings; called flows require separate inspection |
| update_microflow_documentation | Preview/apply documentation text |
| update_decision_expression | Preview/apply an existing expression-based decision's expression |
| list_model_units | Discover units across document types |
| inspect_model_unit | Inspect contained elements, scalar values and summarized references |
| edit_model_properties | Preview/apply a batch of string/number/Boolean scalar edits within one unit |
| list_element_creation_types | Return the supported creation catalog without app credentials |
| create_model_element | Preview/apply one supported contained element |
| delete_model_element | Preview/apply deletion of a contained element/subtree |

Apply operations commit to the configured Team Server development branch. Preview does not commit. Some read operations create temporary online working copies, so they are not labeled as side-effect-free MCP reads.

Creation supports a limited catalog (domain entities/attributes/annotations and selected microflow objects). It does not create complete page/microflow units, graph connections, arbitrary widgets or reference mappings. Scalar editing excludes enums, references, lists and containment. Do not claim that an available primitive editor can perform arbitrary app transformations.

These tools do not validate all Mendix expressions, global model consistency or runtime behavior. They do not deploy an app. See [MCP reference](MCP_REFERENCE.md) and the actual tool schemas.

## Separate terminal path: mxcli

A terminal-equipped assistant can use a separately installed mxcli to inspect and create/modify model documents using MDL. This is the path exercised for complete microflows, pages, event forms and navigation in our practice app. It works on local project files and is not currently wrapped by this MCP server.

Use the exact installed release's help; command availability and Mendix compatibility vary. Do not infer that all mxcli features work from the small set tested here.

## What was actually demonstrated

| Evidence | Scope |
| --- | --- |
| SDK microflow inspection/documentation | Verified with the practice app and Studio Pro |
| Offline MCP/policy tests | Startup/discovery, preview/apply orchestration, stale checks and failure paths |
| mxcli v0.31.0 with Mendix 10.24.9.81004 | Complete microflow creation, branch-return runtime tests, simple page creation and matching Mendix checks |

Later practice-app experiments in the project conversation also covered persisted event editing, manual activation and time-window lifecycle tests. Treat recorded tests as examples for that app, not certification for every Mendix project. The evaluation directory may contain additional local work that has not yet been published.

Page runtime build/consistency checks do not verify appearance, responsiveness or browser interactions. No claim is made that another AI provider/client has been end-to-end certified.

## Requirements by assistant environment

- **Terminal + repository access:** can run scripts and a separately installed mxcli after setup.
- **Local stdio MCP client:** can call the 10 SDK tools after the user configures the server.
- **Remote/cloud assistant:** needs an environment that can reach Mendix and run the dependencies, or a supported local bridge. This repository does not provide a hosted public MCP endpoint.
- **Read-only chat/browser:** can read instructions and produce guidance, but cannot directly modify an app.

The model brand does not change these execution requirements.
