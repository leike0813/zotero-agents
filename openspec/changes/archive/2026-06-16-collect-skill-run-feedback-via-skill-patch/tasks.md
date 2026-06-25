## 1. OpenSpec
- [x] Add delta specs for runtime option, skill patch, apply-time collection, and product UI/API.
- [x] Validate with `openspec validate collect-skill-run-feedback-via-skill-patch --type change --strict`.

## 2. Runtime Option and Patch
- [x] Add default-off global preference `collectSkillRunFeedbackEnabled`.
- [x] Inject `runtime_options.collect_skill_run_feedback` for job/sequence requests when enabled.
- [x] Preserve existing runtime options.
- [x] Add feedback patch template and conditionally include it in materialized skills.

## 3. Apply Collection
- [x] Add best-effort feedback collector.
- [x] Run collector only after successful business apply.
- [x] Read ACP/SkillRunner workspace sidecar first and bundle fallback second.
- [x] Register feedback product records without changing main apply summary counts.

## 4. Product API and Dashboard UI
- [x] Add `skill_run_feedback` product kind helpers.
- [x] Add feedback filtering, multi-select, preview, and export actions.
- [x] Keep normal Products list separate from feedback products.

## 5. Verification
- [x] Add/adjust focused tests for runtime option, patch inclusion, collector, product filtering/export.
- [x] Run relevant focused test commands.
