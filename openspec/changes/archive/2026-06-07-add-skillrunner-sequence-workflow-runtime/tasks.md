## 1. Contract

- [x] Add OpenSpec proposal, design, tasks, and delta specs.
- [x] Add `skillrunner.sequence.v1` request type and manifest schema support.
- [x] Validate ACP-only provider/backend usage and sequence step shape.

## 2. Runtime

- [x] Compile declarative sequence manifests into sequence requests.
- [x] Execute sequence steps serially through ACP skill runs.
- [x] Support default handoff passthrough and explicit handoff field mapping.
- [x] Route only the final step result into workflow apply.

## 3. ACP Workspace Reuse

- [x] Add workflow workspace intent to ACP skill run runtime options.
- [x] Create or reuse ACP run workspace by workflow run id.
- [x] Preserve independent request ids for each sequence step.

## 4. Verification

- [x] Add focused manifest/compiler/runtime/workspace tests.
- [x] Run focused tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run OpenSpec validation for this change.
