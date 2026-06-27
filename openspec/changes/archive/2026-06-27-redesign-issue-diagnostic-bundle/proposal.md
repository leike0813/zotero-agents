## Why

The current diagnostic export is a retained runtime-log dump with light aggregation, which is noisy for issue reporting and still misses key backend setup evidence such as ACP runtime option probes and SkillRunner model cache refreshes. Users need a one-click, redacted, high-signal JSON they can attach to an issue without manually selecting debug filters or collecting workspace files.

## What Changes

- Introduce an issue-focused diagnostic bundle that summarizes environment, context, backend health, incidents, high-signal timeline events, evidence gaps, and redaction policy.
- Keep the existing raw runtime diagnostic export as a developer/debugging path, but stop using it as the default "Copy Diagnostic Bundle" issue artifact.
- Change log viewer default level visibility so `debug` is not selected by default.
- Add runtime log coverage for ACP backend runtime options/cache refresh and SkillRunner model cache refresh.
- Add a coverage assessment to the change design so future logging decisions are tied to issue triage value rather than raw volume.

## Capabilities

### New Capabilities

- `issue-diagnostic-bundle`: Defines the one-click issue diagnostic JSON contract, default contents, raw-log exclusion, evidence gaps, and redaction behavior.

### Modified Capabilities

- `runtime-diagnostic-bundle`: Reclassifies the existing retained-log export as a developer/raw diagnostic path instead of the default issue artifact.
- `runtime-log-pipeline`: Requires high-signal logging for ACP runtime option probes and SkillRunner model cache refreshes while keeping debug gated.
- `log-viewer-window`: Changes the default level filter to hide `debug` and routes the user-facing diagnostic copy action to the issue bundle.

## Impact

- Affected code: `runtimeLogManager`, log viewer/dashboard action handling, ACP backend probe, SkillRunner model cache refresh.
- Public TypeScript surface: adds `RuntimeIssueDiagnosticBundleV1` and a builder for the issue bundle.
- Tests: runtime log manager, log viewer default filters, ACP probe logging, SkillRunner model cache logging, sanitization, and OpenSpec validation.
- No backend API, dependency, or business result artifact changes.
