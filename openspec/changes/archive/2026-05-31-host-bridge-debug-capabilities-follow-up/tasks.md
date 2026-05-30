## 1. OpenSpec

- [x] Create change scaffold.
- [x] Add proposal, design, debug capability specs, CLI debug specs, and tasks.

## 2. Host Bridge Debug Capability Model

- [x] Add `debug` to the Host Bridge capability category model.
- [x] Add a `debugCapability(...)` registration helper with manifest filtering,
  handler-level debug gate, JSON-safe output, and default limit normalization.
- [x] Ensure `getHostBridgeCapability()` returns `null` for `debug.*` when
  debug mode is disabled.
- [x] Mark dangerous debug capabilities as `zotero-ui-required`.
- [x] Validate fixed confirmation phrases inside dangerous debug handlers.

## 3. Global Debug Capabilities

- [x] Implement `debug.status`.
- [x] Implement `debug.persistence.snapshot`.
- [x] Implement `debug.tasks.snapshot`.
- [x] Ensure default outputs omit absolute local paths and raw rows.
- [x] Add bounded list/truncation metadata to all global debug outputs.

## 4. Synthesis Debug Capabilities

- [x] Implement `debug.synthesis.snapshot`.
- [x] Implement `debug.synthesis.queue.list`.
- [x] Implement `debug.synthesis.jobs.list`.
- [x] Implement `debug.synthesis.paper.inspect`.
- [x] Implement `debug.synthesis.topic.inspect`.
- [x] Implement `debug.synthesis.diff`.
- [x] Implement `debug.synthesis.worker.run`.
- [x] Implement `debug.synthesis.maintenance.run`.
- [x] Implement `debug.synthesis.queue.enqueue`, `retry`, `pause`, and
  `resume`.
- [x] Implement `debug.synthesis.jobs.clearStale`.
- [x] Implement `debug.synthesis.queue.clear` with dry-run default and
  `CLEAR SYNTHESIS DEBUG QUEUE` execution confirmation.

## 5. CLI Debug Namespace

- [x] Add top-level `zotero-bridge debug` command.
- [x] Add global commands: `debug status`, `debug persistence`, and
  `debug tasks`.
- [x] Add Synthesis diagnostic commands: `debug synthesis snapshot`, `diff`,
  `inspect-paper`, and `inspect-topic`.
- [x] Add Synthesis queue commands: `debug synthesis queue list`, `enqueue`,
  `retry`, `pause`, `resume`, and `clear`.
- [x] Add Synthesis jobs commands: `debug synthesis jobs list` and
  `clear-stale`.
- [x] Add Synthesis worker and maintenance commands.
- [x] Reuse existing `--input <JSON_OR_FILE>` parsing for inline JSON, `@file`,
  existing file paths, and stdin.
- [x] Preflight the manifest and return `debug_mode_disabled` when the mapped
  debug capability is absent.
- [x] Preserve the CLI single JSON stdout contract.

## 6. Documentation

- [x] Update `doc/host-bridge-cli.md` with debug namespace usage, debug-mode
  requirements, safety boundaries, and examples.
- [x] Update Host Bridge CLI run README template if agent debug guidance is
  needed in debug-mode runs.
- [x] Document dangerous debug operation confirmation phrases.

## 7. Tests and Verification

- [x] Add Host Bridge tests proving debug mode off hides `debug.*` in manifest.
- [x] Add Host Bridge tests proving direct `debug.*` calls return
  `capability_not_found` when debug mode is off.
- [x] Add Host Bridge tests proving debug mode on exposes capabilities and
  ordinary debug diagnostics require no UI approval.
- [x] Add dangerous debug capability tests for UI approval and confirmation
  phrase validation.
- [x] Add CLI mapping tests for all debug subcommands.
- [x] Add CLI disabled-mode tests for `debug_mode_disabled`.
- [x] Add CLI `--input` parsing tests for inline JSON, files, `@file`, and
  stdin.
- [x] Add Synthesis diagnostics tests for snapshot, queue, jobs, paper inspect,
  diff, worker run, stale job cleanup, and queue clear dry-run/execute.
- [x] Add safety tests proving tokens are not printed and local paths require
  `includeLocalPaths: true`.
- [x] Run targeted Host Bridge, CLI, Synthesis, TypeScript, lint, formatting,
  and build verification.
