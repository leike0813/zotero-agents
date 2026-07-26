## Context

`evaluateWorkflowSelection()` is shared by menu availability, diagnostic
availability, and execute-time request preparation. Its `artifact-exists`
rules currently run identically in all modes. For a rule whose target path
depends on a configurable workflow parameter, menu mode resolves the path from
persisted settings or the manifest default before the user can open the
submission dialog. If that artifact exists, the workflow is disabled even
though another parameter value could produce a different, missing target.

The manifest already permits `artifact-exists.parameter`, but the evaluator's
internal narrowed rule type drops that field and one target resolver uses an
implicit parameter name. The declaration is therefore descriptive rather than
authoritative.

The runtime already exposes `mode: "menu" | "execute" | "handoff"`. This fix
can express the correct distinction without a new state machine or UI-specific
API.

## Goals / Non-Goals

**Goals:**

- Keep parameter-dependent artifact existence out of availability decisions.
- Apply the same rule after settings are confirmed, before request construction.
- Skip only units whose artifact matches the confirmed parameter value.
- Make `rule.parameter` the sole parameter-name source.
- Preserve static artifact exclusions and all non-artifact selection policies.
- Make the behavior generic across parameter names and values.

**Non-Goals:**

- Adding or changing the workflow submission dialog.
- Recalculating menu or dialog previews when workflow parameters change.
- Adding queue, provider, persistence, Dashboard, or task-state behavior.
- Adding overwrite confirmation or allowing a matching execution-time artifact
  to run again.
- Generalizing artifact target kinds into arbitrary expressions or hooks.

## Decisions

### 1. Treat menu mode as availability evaluation

Menu and diagnostic callers continue to use `mode: "menu"`. In this mode,
`filterArtifactConflicts()` applies only rules without `parameter`. Rules with
`parameter` are deferred because the user has not confirmed the value that
defines their target path.

Execute mode applies both static and parameter-dependent rules. Handoff mode
retains its current selection-validation bypass semantics.

Alternative considered: add a new `preview` mode. Rejected because the existing
menu mode already represents pre-confirmation availability, and another mode
would duplicate policy without changing the decision.

### 2. Preserve rule evaluation order and skipped accounting

The evaluator partitions rules by applicability but otherwise preserves their
manifest order and existing per-unit conflict semantics. During execute mode, a
matching parameter-dependent artifact removes that scoped unit before
`buildRequest`; selection statistics count it as skipped. A non-matching
parameter value retains the unit. Mixed batches continue with their remaining
units, and an all-skipped batch retains the existing no-valid-input outcome.

Alternative considered: open the dialog but defer the existence check to
provider preflight. Rejected because artifact exclusion is already a
declarative Host concern and should prevent request construction and backend
submission.

### 3. Make the manifest declaration authoritative

The evaluator carries the complete typed `artifact-exists` rule into target
resolution. A parameterized target reads:

```text
executionOptions.workflowParams[rule.parameter]
```

The runtime does not infer a parameter name from target kind, workflow id,
parameter value, locale, or persisted-default identity. The schema/type union
requires `parameter` for target kinds whose target path cannot be resolved
without it. Existing explicit declarations remain valid; ambiguous custom
manifests fail validation rather than silently selecting an implicit parameter.

Alternative considered: keep an implicit fallback for compatibility. Rejected
because it preserves two sources of truth and makes availability semantics
dependent on undocumented target-specific knowledge.

### 4. Keep the contract parameter-value agnostic

Tests use two distinct parameter values and assert only target identity and
phase behavior. A builtin workflow can provide an integration fixture, but no
locale, language code, workflow id, or concrete parameter name becomes part of
the generic runtime requirement.

## Risks / Trade-offs

- [Risk] A user workflow declares a parameterized target without `parameter`.
  → The schema rejects it with the existing manifest validation path; the user
  must add the explicit parameter key.
- [Risk] Menu availability can succeed while every unit is later skipped after
  confirmation.
  → This is intentional: only confirmed settings can answer the execution
  question, and existing no-valid-input feedback remains authoritative.
- [Risk] A future caller uses menu mode expecting execute-time filtering.
  → Tests lock the mode contract and component documentation names menu mode as
  availability evaluation.

## Migration Plan

1. Add failing mode-level evaluator and menu regression tests.
2. Tighten the manifest rule type/schema for parameterized targets.
3. Implement mode-based rule applicability and rule-driven target resolution.
4. Update affected builtin workflow tests from menu blocking to execution skip.
5. Run focused tests, schema/manifest checks, type checking, and strict OpenSpec
   validation.

Rollback restores the prior evaluator and schema together; no data migration or
persistent state rollback is required.

## Open Questions

None.

