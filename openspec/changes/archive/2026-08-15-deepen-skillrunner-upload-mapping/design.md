## Context

`declarativeRequestCompiler.ts` and `sequenceRuntime.ts` both need the
SkillRunner wire path `inputs/<sanitized-key>/<basename>` for local uploads.
The three helpers in each file are byte-for-byte equivalent in observable
behavior, so the request builders currently duplicate a provider request-shape
rule.

## Goals / Non-Goals

**Goals:**

- Put the upload-relative path projection in one provider-side module.
- Keep the public surface to one builder; keep normalizers private.
- Preserve current sanitization, basename fallback, and path normalization exactly.
- Keep `upload_files` entry construction where each request builder owns it.

**Non-Goals:**

- Moving sequence absolute-path detection or `buildSkillRunnerUploadMapping` out of the sequence runtime.
- Changing `SkillRunnerClient.ensureUploadRelativePath` validation or the mock server.
- Adding validation, throwing, or fallback changes.
- Changing workflow manifests or provider contracts.

## Decisions

### One builder, two normalizers private

`buildSkillRunnerUploadRelativePath(fileKey, localPath)` is the only export.
`sanitizeUploadPathSegment` and `normalizeUploadRelativePath` stay module-private
because no caller needs them independently under the locked scope.

### Provider-side location

The module lives at `src/providers/skillrunner/uploadMapping.ts`. Both callers
already depend on provider contracts, and the rule belongs to the SkillRunner
request shape rather than one workflow module.

### Exact behavior preservation

The builder keeps `getBaseName(localPath) || "upload.bin"`, the
`[^A-Za-z0-9._-]` → `-` key sanitization with `file` fallback, and the existing
relative-path normalization chain. No error timing changes.

## Risks / Trade-offs

- [Sequence runtime loses a local helper] -> The new import crosses from workflowExecution to providers/skillrunner; both already depend on provider contracts and the module has no back-import.
- [Private normalizers are harder to test directly] -> Contract tests pin observable outputs through the public builder.
- [Wire path drift remains possible elsewhere] -> The mock server is intentionally left independent; production request builders share one module.

## Migration Plan

Add failing contract tests, implement the provider-side builder, delete the two
private copies, and run workflow/sequence integration suites. Update the
workflows document and OpenSpec, then archive the change. No data migration.
