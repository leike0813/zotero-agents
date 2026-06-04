## Context

`manuscript-literature-framing` is an interactive ACP skill. ACP interactive
runs require the final assistant turn to return a JSON envelope containing
`__SKILL_DONE__: true`; after validation, the runner removes that marker and
writes the validated business payload to `result/result.json`.

The skill runtime currently writes `result/result.json` itself during
`persist_final_draft` and `cancel`. That makes the script-authored file look
like the ACP completion artifact even though it does not contain the assistant
turn marker. The same skill also accepts structurally empty analysis payloads,
which can let weak or placeholder framing pass into writing-plan and final
drafting stages.

## Goals / Non-Goals

**Goals:**

- Keep ACP runner ownership of `result/result.json`.
- Preserve the package-local script as the authority for writing LaTeX and
  business sidecar assets.
- Provide an ACP fallback-compatible business result file that agents can read
  to form the final assistant envelope.
- Add deterministic payload shape checks without moving semantic framing
  judgment into scripts.
- Make host-unavailable cancellation executable and documented.

**Non-Goals:**

- No ACP runner generic changes.
- No changes to the business output schema shape beyond the result file
  location boundary.
- No `__SKILL_DONE__` field in business schemas or persisted business payloads.
- No command interpreter or Python environment changes.

## Decisions

1. **Write business output to `manuscript-literature-framing.result.json`.**
   This matches the ACP fallback file convention `${skill_id}.result.json` at
   the run workspace root and avoids the reserved `result/result.json` path.
   The runner can validate this file as fallback if the assistant envelope is
   invalid.

2. **Keep `__SKILL_DONE__` only in assistant output.**
   The agent reads `manuscript-literature-framing.result.json` and emits one
   JSON object with `__SKILL_DONE__: true` plus all business fields. The marker
   is never persisted by the skill runtime and is not added to
   `assets/output.schema.json`.

3. **Use minimal structural validation for stage payloads.**
   Scripts check for required field groups and non-empty arrays/objects/strings.
   They do not judge taxonomy quality, gap validity, contribution alignment, or
   prose content.

4. **Allow `cancel` to bypass gate only for unavailable required host calls.**
   `gate_runtime.py` remains the normal next-action authority. `SKILL.md` and
   `runner.json` document the narrow exception for required Zotero/Synthesis
   host calls that cannot be performed during real execution.

## Risks / Trade-offs

- **Risk:** Agents may still directly output the business file without marker.
  → Mitigation: Update `SKILL.md` and runner prompt to state the envelope rule
  and rely on existing ACP validation/repair to reject missing markers.

- **Risk:** Minimum field checks could reject useful alternate payload wording.
  → Mitigation: Accept compatible aliases for each field group while keeping
  validation deterministic and transparent.

- **Risk:** Existing users may expect `result/result.json` immediately after
  running the script manually.
  → Mitigation: Document `manuscript-literature-framing.result.json` as the
  script-authored business output and leave run-local assets under `result/`.
