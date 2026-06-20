# Test Taxonomy by Domain

## 1. Domain Taxonomy and Classification Criteria

Canonical test domains:

- `test/core`
- `test/ui`
- `test/workflow-<workflow-id>`

Classification rules:

1. `core`: runtime pipeline, provider contracts, loader, transport, queue, mock governance, shared execution seams.
2. `ui`: menu/dialog/editor host/log-viewer presentation and interaction behavior.
3. `workflow-<id>`: behavior and invariants owned by a concrete workflow package.
4. A test must have exactly one primary domain. Cross-domain concerns should be documented in test comments.

## 2. Naming and File Placement Rules

Rules:

1. Keep existing stable test file names to preserve history and grep familiarity.
2. Place `*.test.ts` directly under the owning domain directory.
3. Shared non-test helpers remain under `test/zotero` during migration window.
4. Domain-local helper shims are allowed and should only re-export shared helpers.

## 3. Fixture Ownership and Co-location Rules

Fixture ownership:

1. Shared fixtures remain under `test/fixtures/selection-context`.
2. Workflow-specific fixtures move to `test/fixtures/workflow-<workflow-id>`.
3. During migration window, immutable or tooling-sensitive assets can remain in original location with explicit alias mapping.

Current fixture ownership:

- `test/fixtures/selection-context/*` -> shared (`core` + multiple workflows)
- `test/fixtures/literature-analysis/*` -> workflow-literature-analysis (legacy path retained)
- deprecated reference-matching fixtures are archived under `deprecated/tests/fixtures/`
- `test/fixtures/workflow-loader-*/*` -> core (loader validation domain)

## 4. Inventory Summary

- Total migrated test suites: 35
- Additional core domain files (created in-place): 13
- Domain distribution:
  - `core`: 37 (24 migrated + 13 in-place)
  - `ui`: 6
  - `workflow-literature-analysis`: 4
  - `workflow-mineru`: 1
- Orphaned test suites after mapping: 0

## 5. Source-to-Target Migration Map

### 5.1 Core Domain

Source root: `test/zotero/*.test.ts`  
Target root: `test/core/*.test.ts`

Mapped files:

- `00-startup.test.ts`
- `10-selection-context-schema.test.ts`
- `11-selection-context-rebuild.test.ts`
- `12-handlers.test.ts`
- `20-workflow-loader-validation.test.ts`
- `24-workflow-execute-message.test.ts`
- `30-transport-skillrunner-mock.test.ts`
- `31-transport-upload-fallback.test.ts`
- `32-job-queue-transport-integration.test.ts`
- `33-provider-backend-registry.test.ts`
- `34-generic-http-provider-e2e.test.ts`
- `36-skillrunner-model-catalog.test.ts`
- `37-pass-through-provider.test.ts`
- `38-generic-http-steps-provider.test.ts`
- `41-workflow-scan-registration.test.ts`
- `42-hooks-startup-template-cleanup.test.ts`
- `42-task-runtime.test.ts`
- `45-runtime-log-manager.test.ts`
- `47-workflow-log-instrumentation.test.ts`
- `48-workflow-execution-seams.test.ts`
- `49-workflow-settings-domain.test.ts`
- `51-workflow-duplicate-guard-seam.test.ts`
- `52-runtime-bridge.test.ts`
- `53-zotero-mock-parity-governance.test.ts`

Additional core domain files (created in-place in `test/core/`, not migrated from `test/zotero/`):

- `55-workflow-apply-seam-risk-regression.test.ts`
- `60-task-dashboard-history.test.ts`
- `62-task-dashboard-snapshot.test.ts`
- `63-job-queue-progress.test.ts`
- `70a-skillrunner-task-reconciler-state-restore.test.ts`
- `70b-skillrunner-task-reconciler-apply-bundle-retry.test.ts`
- `70c-skillrunner-task-reconciler-ledger-reconcile.test.ts`
- `71-skillrunner-run-dialog-ui-e2e-alignment.test.ts`
- `83-skillrunner-run-dialog-waiting-auth-observer.test.ts`
- `87-workflow-package-runtime-diagnostics.test.ts`
- `88-workflow-runtime-scope-diagnostics.test.ts`
- `89-workflow-debug-probe.test.ts`

### 5.2 UI Domain

Source root: `test/zotero/*.test.ts`  
Target root: `test/ui/*.test.ts`

Mapped files:

- `01-startup-workflow-menu-init.test.ts`
- `35-workflow-settings-execution.test.ts`
- `40-gui-preferences-menu-scan.test.ts`
- `44-workflow-editor-host.test.ts`
- `46-log-viewer-behavior.test.ts`
- `50-workflow-settings-dialog-model.test.ts`

### 5.3 Workflow Domains

#### workflow-literature-analysis

Source root: `test/zotero/*`  
Target root: `test/workflow-literature-analysis/*`

- `21-workflow-literature-analysis.test.ts`
- `22-literature-analysis-filter-inputs.test.ts`
- `23-workflow-literature-analysis-fixtures.test.ts`
- `50-workflow-literature-analysis-mock-e2e.test.ts`
- `literature-analysis-fixture-cases.ts` (helper module)

#### deprecated reference note workflow suites

`workflow-reference-matching` and `workflow-reference-note-editor` are no longer active test domains. Historical suites and fixtures are archived under `deprecated/tests/`.

#### workflow-mineru

- `test/zotero/39-workflow-mineru.test.ts`
  -> `test/workflow-mineru/39-workflow-mineru.test.ts`

### 5.4 Fixture Migration Map

- reference-matching fixture assets have moved to `deprecated/tests/fixtures/`.

Compatibility note:

- Active shared test helpers no longer alias `reference-matching` fixture paths.

## 6. Coverage Sanity Check

Validation checklist:

1. No `*.test.ts` remains under `test/zotero`.
2. Every previously active suite is represented in one domain directory.
3. Imports compile via domain-local re-export helpers.
4. Node test execution passes with new layout.
