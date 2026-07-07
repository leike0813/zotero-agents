## Context

ACP Skills validates file-backed inputs from the local request before starting the backend session. Workflow build hooks that write generated inputs to Zotero's core temp directory can therefore produce paths that are valid at build time but missing by the time a later ACP sequence step starts.

The plugin already owns a runtime persistence root with `runtime/tmp` cleanup policy. That root is appropriate for generated execution files that are temporary but must outlive Zotero core temp directory recreation.

## Goals / Non-Goals

**Goals:**

- Provide one semantic host API for workflow-generated provider input files.
- Store generated input files under plugin-managed `runtime/tmp/workflow-inputs`.
- Migrate builtin workflow inputs currently written to Zotero core temp.
- Preserve ACP absolute-path behavior and SkillRunner upload packaging behavior.

**Non-Goals:**

- Do not make generated workflow inputs durable user data.
- Do not change sequence file handoff semantics.
- Do not migrate execution-internal scratch files that are created and deleted within one provider operation.

## Decisions

- Add `materializeWorkflowInputFile()` to `runtime.hostApi.file` instead of only exposing a directory. The host API remains the single owner of root choice, safe path segments, unique names, and write behavior.
- Store files under `getRuntimePersistencePaths().tmpDir/workflow-inputs/<workflowId>/<key>/`. This uses existing runtime cleanup governance and avoids Zotero core temp lifecycle.
- Return only the absolute local `path` for now. Existing request builders already know whether a backend path should be passed directly or listed in `upload_files`.
- Keep `getTempDirectoryPath()` for short-lived scratch compatibility but document it as ephemeral and unsuitable for provider inputs.

## Risks / Trade-offs

- Runtime tmp files are still cleanable after the existing TTL. This is acceptable because they are execution inputs, not durable artifacts.
- Existing external workflows can still call `getTempDirectoryPath()`. Documentation and builtins will establish the new contract without introducing a breaking removal.
- Host API version increases, so tests and diagnostics must accept version 6.
