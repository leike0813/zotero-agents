## Context

This change prepares the runtime data model for a later architecture refactor. The current code already has several runtime guards: provider request contracts validate `requestKind + backend.type`, workflow settings are mostly routed through `workflowSettingsDomain`, and runtime logs are already migrated toward runtime persistence files. The remaining risk is that core model shapes are still too permissive at compile time and at persistence boundaries.

The highest-risk boundaries are:

- `BackendInstance.type`, which is persisted as a string and drives provider resolution.
- `JobRecord.meta`, which carries the execution context used by queueing, task projection, logs, SkillRunner recovery, and sequence orchestration.
- `workflowSettingsJson`, which has an implicit record shape and more than one local parser.
- `runtimeLogsJson`, which should remain a legacy migration path rather than the durable runtime log store.

## Goals / Non-Goals

**Goals:**

- Make backend type values explicit and shared across backend registry and provider dispatch code.
- Make the stable core of job metadata visible as a TypeScript contract without blocking workflow-specific metadata.
- Give workflow settings persistence a versioned domain document while reading existing unversioned settings.
- Confirm runtime log persistence semantics with tests so future refactors do not accidentally reintroduce prefs-backed log storage.
- Keep the implementation low-risk and behavior-compatible for existing valid user configuration.

**Non-Goals:**

- Do not introduce a new dependency or replace the current provider request contract system.
- Do not convert every provider request and result into one large TypeScript union in this change.
- Do not redesign runtime log retention, log viewer UI, or diagnostic bundle export.
- Do not migrate backend config storage out of prefs in this change.
- Do not change workflow settings UI behavior beyond persistence shape normalization.

## Decisions

1. **Use a closed `BackendType` union at the model boundary.**

   Define `BackendType = "skillrunner" | "acp" | "generic-http" | "pass-through"` in the backend model layer, backed by exported constants from defaults where practical. `BackendInstance.type` will use this union. Backend registry normalization will reject unknown type strings and report the entry as invalid.

   Alternative considered: keep `type: string` and only strengthen provider dispatch checks. That still lets invalid config circulate through backend listing, settings selection, and task history before failing.

2. **Normalize backend type at load time rather than at every dispatch call.**

   `normalizeBackendEntry()` is the persistence boundary for backend config. It should trim and validate type once, then return a `BackendInstance` with a trusted `BackendType`.

   Alternative considered: add ad hoc guards in each provider. That repeats logic and misses UI and settings paths that consume backend lists before dispatch.

3. **Type the stable core of `JobRecord.meta` and keep an extension slot.**

   Introduce `JobRecordMeta` for known fields such as `backendId`, `backendType`, `backendBaseUrl`, `providerId`, `requestKind`, `runId`, `workflowRunId`, `requestId`, skill identity fields, sequence fields, target/input labels, and SkillRunner lifecycle fields. Preserve `[key: string]: unknown` so workflow-specific metadata and transitional fields remain possible.

   Alternative considered: fully seal `meta`. That is too risky because workflows and recovery paths still attach specialized fields outside a single owner.

4. **Leave `request` and `result` broad for now.**

   Provider request payloads already pass through `requestContracts`, and provider results intentionally differ between terminal, deferred, waiting, failed, and diagnostic forms. This change should avoid a large union that would obscure the data model hardening goal.

   Alternative considered: type all request/result values now. That expands the blast radius into every provider and workflow compiler path.

5. **Version workflow settings as a domain document.**

   Add a `WorkflowSettingsDocument` with a schema version and a `workflows` map. The parser will accept both the existing unversioned map and the new document. Writers owned by the settings domain will emit the versioned document. Backend ID remapping will understand both shapes and write the versioned form after mutation.

   Alternative considered: keep the unversioned map and only add TypeScript aliases. That does not protect future migrations or distinguish malformed records from a valid empty settings document.

6. **Keep runtime logs file-first and prefs-legacy.**

   The current runtime log manager writes to runtime persistence files and clears the old pref key after flush/migration. The design is to protect that behavior with tests and, if needed, small naming/comment cleanup. This is not a log storage rewrite.

   Alternative considered: move logs to SQLite now. That belongs to a separate performance/storage change because it affects retention, UI reads, exports, and cleanup.

## Risks / Trade-offs

- Unknown backend types may have existed in experimental local prefs. They will become invalid entries. Mitigation: preserve existing invalid-backend reporting and do not make the whole registry fatal.
- Stronger `JobRecordMeta` can expose many compile errors at once. Mitigation: keep an index signature and type only stable fields used across modules.
- Versioned workflow settings can break code that assumes the raw pref is a workflow map. Mitigation: route all plugin reads through the domain parser and update backend remap code together.
- Runtime log tests may be timing-sensitive if they depend on scheduled persistence. Mitigation: use `flushRuntimeLogsPersistence()` or existing test helpers, not timer assumptions.

## Migration Plan

1. Add model constants and types, then update backend registry normalization and provider compatibility helpers.
2. Add `JobRecordMeta` and adjust queue/runtime call sites to use it without changing emitted metadata fields.
3. Add the versioned workflow settings document parser/writer and update settings/remap call sites.
4. Add runtime log persistence assertions around the existing flush/migration path.
5. Run focused node tests and `npx tsc --noEmit`.

Rollback is source-level: revert the type/persistence-shape changes. Existing unversioned workflow settings remain readable throughout, so rollback does not require a data migration.
