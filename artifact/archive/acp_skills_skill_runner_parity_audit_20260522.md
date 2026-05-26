# ACP Skills / Skill Runner Parity Audit - 2026-05-22

## Root Cause Confirmed

`assets/output.schema.json` is the Skill Runner default output schema path. It does not need to be declared in `assets/runner.json`.

The ACP Skills path currently applies this fallback while building the thin-proxy output contract prompt, but not while validating final output. As a result, a final ACP result can omit fields required by `assets/output.schema.json` and still pass validation, so output repair is skipped.

Concrete failure shape:

- `literature-digest.result.json` contained `representative_image.markdown_src_hint`.
- `result/result.json` lost `representative_image.markdown_src_hint`.
- `literature-digest/assets/output.schema.json` required that field for `status=selected` + `source_kind=markdown_image_ref`.
- ACP output validation did not load the default output schema and accepted the incomplete result.

## Differences That Must Be Fixed

1. Unified schema resolution:
   - Skill Runner resolves `runner.schemas.<key>` first and falls back to `assets/<key>.schema.json`.
   - ACP must use the same rule for `input`, `parameter`, and `output`.

2. Entrypoint prompt rendering:
   - Skill Runner renders `runner.entrypoint.prompts.<engine>` or `common`.
   - ACP currently sends a generic prompt, so skill-specific runner instructions can be lost.

3. Request schema validation:
   - Skill Runner validates input and parameter payloads before execution.
   - ACP must validate equivalent payloads, while preserving ACP's host-local absolute file path behavior.

4. Result-file fallback:
   - Skill Runner can recover from package-generated `<skill-id>.result.json` or `entrypoint.result_json_filename`.
   - ACP must try the same fallback before failing or repairing assistant text.

5. Skill package validation:
   - Skill Runner validates runner shape, schema files, schema annotations, execution modes, and identity.
   - ACP registry currently admits malformed packages too easily.

6. `x-type` schema annotation validation:
   - ACP should reject invalid `x-type` values in output schema.
   - ACP should not normalize, move, or rewrite artifact paths; that remains a deliberate divergence.

## Deliberate Differences To Preserve

1. Structured output pipeline:
   - ACP will not generate run-scoped target output schemas.
   - ACP will not pass engine-specific structured-output schema CLI options.
   - ACP will keep passive validation plus bounded output repair.

2. Artifact path normalization:
   - ACP will not rewrite `x-type` output fields to bundle-relative paths.
   - Apply-result hooks remain responsible for consuming ACP-local result paths.

3. Run-local skill materialization:
   - ACP keeps shared catalog plus agent-family skill injection.
   - It does not copy Skill Runner's full run-local snapshot model.

4. Interactive attempt model:
   - ACP keeps its own free conversation and recovery model.
   - The known bug class to guard is prompt-chain or recovery state poisoning that skips repair or prevents later replies.

5. Engine config and runtime options:
   - ACP backend mode/model/reasoning selection remains ACP-native.
   - `engine_configs` and Skill Runner `hard_timeout_seconds` are not implemented in this change.

## Recommended Fix Waves

1. P0:
   - Add shared ACP schema resolver.
   - Use it in output validation.
   - Add regression coverage for default output schema fallback and `representative_image` validation.

2. P1:
   - Validate input and parameter against schema before prompt execution.
   - Render entrypoint prompts with resolved input/parameter contexts.
   - Add result-file fallback.

3. P2:
   - Harden plugin skill registry validation.
   - Audit ACP interactive/recovery state differences and add targeted regression tests.

