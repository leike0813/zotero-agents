## 1. OpenSpec

- [x] Add delta specs for skill documentation, runtime manifest sidecars, and
  workflow apply behavior.
- [x] Validate the change with OpenSpec.

## 2. Runtime and Host Contract

- [x] Add `sidecars` to topic analysis and patch manifest schemas.
- [x] Update `validate_final_artifacts` to render all three sidecars in the
  manifest and stop writing sidecar paths to canonical stdout.
- [x] Update result output schemas and `validateSynthesisResultBundle()` so
  `analysis_manifest_path` is the canonical sidecar discovery entrypoint.
- [x] Update host apply to ingest sidecars from manifest entries, with legacy
  top-level bundle path fallback.

## 3. Skill Instructions

- [x] Make create/update `SKILL.md` payload-writing stages schema-first.
- [x] Make detailed `references/step_*.md` guidance schema-first.
- [x] Normalize stage headings and gate guidance to canonical stage/action names.

## 4. Tests and Verification

- [x] Update contract tests for manifest sidecar SSOT and output schema changes.
- [x] Update documentation tests for schema-first stage guidance.
- [x] Run targeted mocha tests, `tsc`, Prettier check, ESLint, and OpenSpec
  validation.
