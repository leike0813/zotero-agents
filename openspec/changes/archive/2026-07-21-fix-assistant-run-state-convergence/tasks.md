## 1. Regression Tests

- [x] 1.1 Add controllable long-lived SkillRunner SSE tests for queued startup, waiting reply rearm, stale waiting suppression, history catch-up, cursor continuity, and single stream ownership without task reselection.
- [x] 1.2 Add live/boundary transcript publication tests that lock count/revision convergence and preserve non-transcript DOM identity.
- [x] 1.3 Add ACP table-driven tests for backend switch reset, mode/model/provider/raw-model/reasoning membership, live catalog drift, runtime setters, and generic option retention.
- [x] 1.4 Add behavior tests for shared custom-select canonical value and all workflow settings backend-switch surfaces.

## 2. SkillRunner Implementation

- [x] 2.1 Consolidate selected-run management, pending, history, and chat lifecycle in the run observer; remove the inactive session-state subscription dependency from that path.
- [x] 2.2 Add queued/running stream eligibility, reply handoff protection, drain-before-close history catch-up, cursor-safe reconnect, and atomic live transcript publication.
- [x] 2.3 Preserve boundary/silent semantics and all Assistant region-level DOM identity guarantees.

## 3. ACP and Workflow Settings Implementation

- [x] 3.1 Add provider option retention metadata and a shared backend-change rebase used by Web, Dashboard, and native workflow settings.
- [x] 3.2 Canonicalize shared custom-select state so displayed, selected, collected, and submitted values cannot diverge.
- [x] 3.3 Make ACP runtime selection normalization catalog-aware, reset backend-scoped draft values, and derive raw model only from valid target selections.
- [x] 3.4 Reconcile live session catalogs by atomic selection replacement, guard all runtime setters, and stop projecting catalog-external composer values.

## 4. Documentation and Verification

- [x] 4.1 Update affected current-state specs and implementation documentation without adding compatibility history to user-visible UI.
- [x] 4.2 Run targeted tests, TypeScript, formatting/lint checks, SSOT/localization/help-doc governance, and strict OpenSpec validation.

## 5. ACP Drawer Status Regression

- [x] 5.1 Add ACP Skills and ACP Chat status-axis, localization, nullable-wire, and managed-region identity regression coverage while preserving SkillRunner expectations.
- [x] 5.2 Route exact ACP task cards through the shared status projector and inject shared localized drawer labels without changing owner-navigation DTOs.
- [x] 5.3 Update affected current-state deltas and run focused tests 97/184/190, TypeScript, target formatting/lint, localization/help-doc governance, and strict OpenSpec validation.

## 6. SkillRunner Lightweight Apply Projection

- [x] 6.1 Add real run-store and sidebar snapshot regressions for selected/unselected persisted Apply states, selection changes, independent Backend/Apply/Main axes, and successful idle Apply fallback.
- [x] 6.2 Prefer selected full-record status facts and otherwise preserve Backend and Apply state, error, and retry facts from the lightweight row without restoring per-card full-record reads.
- [x] 6.3 Update current-state documentation and run focused tests 71/97/190, TypeScript, target formatting/lint, SSOT/localization/help-doc governance, and strict OpenSpec validation.
