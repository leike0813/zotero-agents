## 1. OpenSpec

- [x] Add proposal, design, tasks, and delta specs for the ACP preset dialog
  change.
- [x] Validate the OpenSpec change.

## 2. ACP Preset Model

- [x] Replace separate isolated preset IDs with agent-level preset metadata.
- [x] Add a pure preset materializer for `useNpx` and `isolated` options.
- [x] Change built-in OpenCode to the bare `opencode acp` command and migrate
  old automatic npx profiles without overwriting customized profiles.

## 3. Backend Manager UI

- [x] Replace the ACP preset selector/add flow with a preset configuration
  subwindow inside the Backend Manager iframe.
- [x] Render live read-only previews, npx prerequisite warnings, and isolation
  warnings.
- [x] Confirm/cancel preset choices without bypassing the existing draft row
  save path.

## 4. Documentation

- [x] Update only the Chinese documentation-site source for the new preset
  configuration flow.
- [x] Do not rebuild generated help docs.

## 5. Tests and Verification

- [x] Add/update focused tests for preset materialization, built-in OpenCode
  migration, UI affordances, duplicate guards, and documentation source.
- [x] Run targeted formatting and node tests.
