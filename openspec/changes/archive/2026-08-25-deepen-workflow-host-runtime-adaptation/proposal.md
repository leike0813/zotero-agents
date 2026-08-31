## Why

`createWorkflowHostApi()` currently contains cross-runtime filesystem selection,
managed workflow-input materialization, native picker fallback, note-image
preparation, and stored-attachment companion copying. These implementations sit
beside the projection composition, duplicate established runtime adapters, and
make host invariants difficult to test through stable interfaces.

The existing `runtimePersistence`, `filePicker`, and `archive` modules already
prove several real seams. The workflow-local policies should deepen those seams
instead of adding an umbrella runtime facade.

## What Changes

- Keep Workflow Host API v11 unchanged while making `createWorkflowHostApi()` an
  explicit composition root for workflow-local modules.
- Make runtime persistence the sole owner of Gecko/Node filesystem adapter
  selection while preserving distinct strict and tolerant read/write semantics.
- Give managed workflow-input materialization, note-image preparation, and
  stored-attachment import one deep module each.
- Make the shared file-picker module own native multi-file selection and toolkit
  fallback for every picker mode.
- Make stored-attachment companion import fail closed through complete path
  validation, pre-mutation staging, and best-effort rollback after mutation.
- Preserve the existing archive module and note-image compression policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-persistence-governance`: distinguish strict workflow-facing file I/O
  from tolerant persistence reads while sharing the same runtime adapters.
- `workflow-input-file-materialization`: retain one host-owned materialization
  contract behind a dedicated workflow module.
- `zotero-host-capability-broker`: keep the Workflow Host API projection explicit
  and make workflow-local runtime adaptation fail closed without changing v11.

## Impact

- Runtime modules: `src/modules/runtimePersistence.ts`,
  `src/platform/filePicker.ts`, and new focused workflow modules.
- Workflow projection: `src/workflows/hostApi.ts`; no public type or version
  change.
- Tests: runtime persistence, picker, note-image preparation, stored-attachment
  import, broker projection, and unchanged archive regression.
- Documentation: project constraints, domain vocabulary, runtime persistence
  SSOT, and broker/projection SSOT.
- No persisted-data migration, Host Bridge surface change, release action, or
  generated help-doc edit.
