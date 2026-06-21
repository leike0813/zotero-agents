## 1. Contract Tests

- [x] 1.1 Add backend registry tests covering all governed backend type values and rejecting an unknown backend type as an invalid backend entry.
- [x] 1.2 Add provider/backend compatibility tests proving valid backend types still resolve through `requestKind + backend.type`.
- [x] 1.3 Add job queue/runtime tests proving core job metadata survives enqueue, provider progress, deferred result, and failure paths.
- [x] 1.4 Add workflow settings domain tests for reading the legacy unversioned settings record and writing the new versioned document.
- [x] 1.5 Add backend id remap tests for versioned workflow settings documents.
- [x] 1.6 Add runtime log persistence tests proving flush writes runtime persistence file storage and leaves `runtimeLogsJson` non-primary.

## 2. Backend Type Hardening

- [x] 2.1 Add shared backend type constants, including `GENERIC_HTTP_BACKEND_TYPE`, and define the `BackendType` union.
- [x] 2.2 Change `BackendInstance.type` to `BackendType` and update dependent function signatures that currently accept backend type strings.
- [x] 2.3 Add backend type normalization in backend registry loading and report unknown types through existing invalid backend diagnostics.
- [x] 2.4 Replace provider/backend string literals with shared constants where doing so reduces drift without unrelated refactoring.

## 3. Job Metadata Hardening

- [x] 3.1 Define `JobRecordMeta` for stable workflow, backend, provider, request, run, task, sequence, and SkillRunner lifecycle fields.
- [x] 3.2 Change `JobRecord.meta` and job enqueue metadata input to use `JobRecordMeta` while preserving extension metadata.
- [x] 3.3 Add a lightweight metadata normalization helper for stable string, boolean, and numeric core fields.
- [x] 3.4 Update queue, task projection, recoverable-state, run seam, and reconciler call sites to use the typed metadata contract.

## 4. Workflow Settings Document

- [x] 4.1 Add `WORKFLOW_SETTINGS_SCHEMA_VERSION`, `WorkflowSettingsDocument`, and shared parser/writer helpers in the settings domain.
- [x] 4.2 Make settings reads accept both legacy unversioned records and the new versioned document shape.
- [x] 4.3 Make settings writes emit the versioned document shape.
- [x] 4.4 Route `normalizeSettings` hook patches through shared domain parsing instead of duplicate local patch parsing.
- [x] 4.5 Update backend reference remapping to support and persist the versioned settings document.

## 5. Runtime Log Persistence Guardrails

- [x] 5.1 Confirm runtime log hydration still supports legacy `runtimeLogsJson` pref data when no runtime log file exists.
- [x] 5.2 Confirm runtime log flush writes through runtime persistence file storage and clears or avoids prefs-primary retained entries.
- [x] 5.3 Keep runtime log viewer, filtering, diagnostic export, and retention behavior unchanged.

## 6. Verification

- [x] 6.1 Run the focused node/core tests for backend registry, provider dispatch, job queue/task runtime, workflow settings, and runtime logs.
- [x] 6.2 Run `npx tsc --noEmit`.
- [x] 6.3 Update implementation notes or nearby docs only if the final code changes persistence semantics visible to maintainers.
