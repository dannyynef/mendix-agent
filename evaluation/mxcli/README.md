# mxcli compatibility experiment

## Observed result (2026-11-10)

Pinned tool: `mendixlabs/mxcli` release **v0.31.0**, Windows amd64.
SHA-256: `0a63a7884e91947765370a4111420676ac0121565d233c7cacd480f2f79ed6d1`.

Source app: `ScheduledActionsLab`, local `agent-practice` checkout, Mendix **10.24.9.81004**. Source Git status was clean before the experiment. The initial experiment left the source app unchanged; the later authorized transfer is recorded below.

An isolated copy under `.local/mxcli-evaluation/ScheduledActionsLab` received `branch-probe.mdl`. This creates `MyFirstModule.SUB_MxcliBranchProbe` in the `AgentEvaluation` folder, with a Boolean parameter, an exclusive decision, a logging action on each branch, and Boolean returns.

Verified:

- Download matched the published release SHA-256; executable reported v0.31.0.
- mxcli read the existing app and listed its 19 microflows.
- `mxcli check` passed syntax, reference and expression checks against the exact app version.
- `mxcli exec` created the probe in the disposable copy.
- `DESCRIBE MICROFLOW` read back both branches, actions, parameter and returns.
- Installed Mendix 10.24.9 `mx check` loaded the generated model and reported **0 errors**.

The initial consistency check used only `.mpr` and `mprcontents`, producing missing widget/theme errors. After copying the app's supporting assets, the check reported zero errors. A complete app directory is necessary for this validation.

The user subsequently confirmed the transferred microflow opened successfully in Studio Pro. Runtime and page results are recorded below. These narrow experiments do not establish general compatibility or justify replacing the existing editor.

## Runtime and page follow-up (2026-11-10)

All follow-up changes and execution used the disposable copy, leaving the open agent-practice checkout unchanged.

- `branch-probe.test.mdl` executed on Mendix runtime 10.24.9.81004 through `mxcli test --local --db-type hsqldb --require-assertions`, using installed Studio Pro 10.24.9 mxbuild and a scratch file database.
- **2 tests passed, 0 failed**, one assertion each: true input returns true; false input returns false. `branch-results.xml` preserves the JUnit report.
- Runtime log independently recorded both `mxcli probe: true branch` and `mxcli probe: false branch`. Log messages were observed, not asserted by the test suite.
- The matching runtime was downloaded and successfully booted and executed the tests. The test runtime shut down and the runner reported project restoration.
- `page-probe.mdl` created `MyFirstModule.MxcliProbePage`, using existing `Atlas_Core.Atlas_Default`, a layout grid, separate text containers, and a Close button. Describe read it back successfully.
- Mendix 10.24.9 consistency checks reported **0 errors** before runtime testing and after cleanup. The page was present in the successful runtime build.
- Page appearance, navigation and Close-button behavior have not been reviewed in a browser or Studio Pro. No desktop/browser control was used. The page has not been transferred to agent-practice.

Repeat runtime tests from the source repository:

```powershell
& '.\.local\mxcli\v0.31.0\mxcli.exe' test 'evaluation\mxcli\branch-probe.test.mdl' -p '.local\mxcli-evaluation\ScheduledActionsLab\ScheduledActionsLab.mpr' --local --db-type hsqldb --require-assertions --mxbuild-path 'C:\Program Files\Mendix\10.24.9.81004\modeler\mxbuild.exe' --timeout 2m --junit '.local\mxcli-evaluation\branch-results.xml'
```

## Local artifacts

Ignored local artifacts:

- `.local/mxcli/v0.31.0/mxcli.exe`
- `.local/mxcli-evaluation/ScheduledActionsLab/ScheduledActionsLab.mpr`
- `.local/mxcli-evaluation/after-check.json`
- `.local/mxcli-evaluation/after-check.log`

The copy includes model and supporting project assets, but excludes the original Git repository, deployment, Studio Pro lock file and user settings. It is not a Team Server checkout. Open this copy explicitly to review it; do not pull it into the original app.

## Commands used

Run from the source repository in PowerShell, only against the disposable copy:

```powershell
$cli = '.\.local\mxcli\v0.31.0\mxcli.exe'
$mpr = '.local\mxcli-evaluation\ScheduledActionsLab\ScheduledActionsLab.mpr'
& $cli check 'evaluation\mxcli\branch-probe.mdl' -p $mpr
# Creation has already run in the existing copy. Use a fresh copy to repeat it.
# & $cli exec 'evaluation\mxcli\branch-probe.mdl' -p $mpr
& $cli -p $mpr -c 'DESCRIBE MICROFLOW MyFirstModule.SUB_MxcliBranchProbe;'
& 'C:\Program Files\Mendix\10.24.9.81004\modeler\mx.exe' check $mpr --json '.local\mxcli-evaluation\after-check.json'
```

## Next verification

### Transfer to agent-practice

After the user closed Studio Pro and explicitly requested transfer, the same MDL was checked and executed against the clean local agent-practice checkout. Mendix 10.24.9 again reported zero errors. Commit `99ac64b` (`Add mxcli branch probe microflow`) contains only the MPR change and two new units (folder and microflow). Local checkout is clean; mxcli cache is excluded locally through `.git/info/exclude`.

The Team Server push could not authenticate noninteractively (`Cannot prompt because user interactivity has been disabled; unable to get password from user`). Remote publication is not confirmed. The user can reopen the existing agent-practice app to see the microflow immediately and use Studio Pro's Push to publish the already-created commit.

Open the disposable copy in Studio Pro 10.24.9 and inspect `AgentEvaluation/MxcliProbePage`. Visual rendering and the Close action remain to be checked. The branch microflow's two runtime cases have passed automatically.

After those checks, design a separate local-file adapter for mxcli. Keep it distinct from SDK/Team Server tools, require an isolated project path, pin the tool version, preview changes, check with the matching Mendix toolset, and report runtime validation separately. Do not enable arbitrary edits of a Studio Pro-open project.

## Sources

- https://github.com/mendixlabs/mxcli/releases/tag/v0.31.0
- https://www.mxcli.org/appendixes/version-compatibility.html
- The pinned executable's `syntax microflow.create`, `syntax microflow.logging`, and `check --help` output. These were used over older examples on the documentation site.
