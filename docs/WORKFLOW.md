# Operating workflow for app changes

## Establish the target

Read the user's request, the app's own instructions and relevant repo instructions. Identify the app, exact Mendix version, development branch, local project path or SDK configuration, and existing user changes. Keep the tool repo separate from the app repo.

Inspect the actual model first: entity attributes, enumeration captions, microflow parameters/calls, page parameters, layouts, widget definitions, security and navigation. Do not apply practice-app names to another app.

## SDK/MCP workflow

1. Discover/list the relevant model objects.
2. Inspect exact IDs and supported properties.
3. Preview the requested edit and review before/after values or subtree/fingerprint.
4. Apply within the user's authorization using expected values from that preview.
5. Verify the current model and Team Server history. Pull/update Studio Pro to view committed changes.
6. Run model consistency and behavior checks appropriate to the change.

A timeout during apply can mean the remote commit succeeded. Never blindly repeat an uncertain write.

## mxcli workflow

1. Confirm a development branch and clean/understood Git status. Commit/back up existing user work. Close the target app in Studio Pro.
2. For a new operation, create a full disposable project copy. Preserve supporting assets; exclude Git internals, lock files, runtime databases and deployment caches.
3. Inspect with the pinned executable. Write a scoped MDL script using discovered names.
4. Review the script, run `mxcli check change.mdl -p app.mpr`, and use `mxcli diff -p app.mpr change.mdl` when appropriate. Check command help on the pinned version.
5. Execute on the copy, then run the matching Mendix checker. For example on Windows:
   `& 'C:\Program Files\Mendix\<exact-version>\modeler\mx.exe' check 'C:\copy\App.mpr'`.
6. Resolve widget/version issues on the copy. `mxcli fix widgets -p app.mpr --mx <matching-mx-path>` preserves MPR v2; direct Mendix widget updates can change storage format.
7. Test meaningful behavior against a scratch runtime/database. For supported pinned versions, `mxcli test suite.test.mdl -p app.mpr --local --db-type hsqldb --require-assertions` is one option. It injects temporary test model elements; use a disposable project. Running tests may download the matching runtime and require Java/build dependencies. Do not attach to a user's live database without explicit authorization.
8. Inspect the diff, expected model units and storage format. A zero-error checker is not permission to commit unrelated deletions or mass rewrites.
9. Apply the validated operation to the identified development checkout only when authorized and still closed/unchanged. Recheck there.
10. Commit scoped model files. Push only as authorized, without force; inspect conflicts rather than overwriting remote history. A failed authentication leaves a local commit unpublished.
11. Reopen in Studio Pro and review/test the UI. If the user prohibits desktop control, provide exact navigation steps and let them perform that review.

Use additive edits or in-place patches when they preserve user content. Replacing an entire page can remove unrelated widgets; inspect before choosing that operation. Do not blindly run the example MDL against an arbitrary app.

## Time and persistence

For saved-data features, test a fresh database retrieval, not only the same in-memory object. For scheduled work, test boundaries and cancelled/finished states; distinguish direct scheduler-entry tests from an actual timed wait. State whether the runtime must remain running and how often the scheduler checks.

## Report the result

State what changed, where to find it, checks performed and limits. Separate source-repo publication, local app commits, Team Server publication and deployment. Never say a remote push, visual test or timed scheduler run succeeded unless it was observed.
