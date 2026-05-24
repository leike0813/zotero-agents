## Context

Skill Runner has a common asset resolver and validator pipeline for `input`, `parameter`, and `output` schemas. ACP Skills currently duplicates only parts of this behavior, so different ACP stages can disagree about which schema exists.

## Goals / Non-Goals

**Goals:**

- Use one ACP resolver for all Skill Runner schema assets.
- Validate ACP inputs, parameters, and outputs before the next execution stage consumes them.
- Render Skill Runner entrypoint prompts with ACP-local file paths.
- Recover valid package-generated result files before repair/failure.
- Reject malformed local skill packages earlier in registry scanning.

**Non-Goals:**

- Do not implement Skill Runner's active structured output pipeline.
- Do not create `.audit/contracts/target_output_schema.json`.
- Do not normalize or rewrite artifact path fields.
- Do not replace ACP's interactive conversation model.
- Do not emulate `engine_configs` or Skill Runner hard timeout behavior.

## Decisions

- Add an ACP-native schema asset resolver instead of reusing prompt materializer helpers. This avoids prompt and validation paths drifting again.
- Keep ACP file inputs as absolute host-local paths. Skill Runner upload-relative paths remain invalid after ACP adaptation.
- Render only simple Jinja-style dotted variables used by current built-in runner prompts. Unsupported expressions are diagnostics, not a new templating dependency.
- Result-file fallback runs only when assistant output is invalid, and fallback payload must pass the same output schema validator.
- Registry validation is strict enough to exclude malformed skills but preserves user skill shadowing of built-ins.

## Risks / Trade-offs

- Stricter package validation can expose existing malformed user skills. Mitigation: return structured diagnostics with reasons instead of vague scan failures.
- Prompt rendering without full Jinja can miss future complex templates. Mitigation: built-ins should keep entrypoint prompts simple; complex expressions produce diagnostics.
- Input schema validation can reject requests that previously reached the agent. Mitigation: this is intended for contract violations; ACP keeps absolute local file path support.

