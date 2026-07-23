## 1. Contract Tests

- [x] 1.1 Update focused runtime tests for semantic-minimal Stage 10-50 payloads, gate templates/enums, discovery delta merging, and runtime-derived context.
- [x] 1.2 Update focused terminal/receipt tests for raw Host receipts, deterministic ledger/final output, replay, tampering, input drift, and corrupt-state blockers.
- [x] 1.3 Update workflow/output tests for strict minimal outcomes and unchanged apply-hook tag behavior.

## 2. Schema And Runtime

- [x] 2.1 Rewrite the runtime action schema around semantic payload definitions with strict fields, explicit enums, examples, and qualified/not-attempted/found conditions.
- [x] 2.2 Replace the completed output schema with strict count-summary and conditional minimal-outcome branches while preserving the canceled shape.
- [x] 2.3 Refactor stage runtime normalization to derive internal actions, rounds, candidates, identities, counts, metadata projections, PDF status, and fixed policies.
- [x] 2.4 Implement additive discovery-delta merging with stable candidate ids and identity-change rejection.
- [x] 2.5 Bind raw Host receipts to current state, reject cross-candidate reuse, and preserve fatal-failure, hash, replay, and tamper gates.
- [x] 2.6 Generate the compact ledger and completed/canceled final output deterministically at terminal state.
- [x] 2.7 Extend the gate response with schema-backed payload templates/enums and terminal `final_output`.

## 3. Skill And Workflow Guidance

- [x] 3.1 Update the complete main Skill without semantic loss, removing only the authorized body sections and replacing every stage example with the real semantic-minimal contract.
- [x] 3.2 Update all four stage references with deeper field semantics, examples, anti-examples, delta discovery, raw receipts, and generated output/recovery guidance.
- [x] 3.3 Update the runner description/prompt and workflow README for interactive-mode wording, schema-guided payloads, actual state paths, and generated terminal output.

## 4. Verification

- [x] 4.1 Run focused runtime/workflow tests and resolve every regression.
- [x] 4.2 Run TypeScript, Prettier, ESLint, Ruff, builtin manifest, SSOT, strict OpenSpec, and diff validation gates.
- [x] 4.3 Audit the finished Skill against the semantic preservation matrix and skill-smith trigger, Tier 5, reference, LLM/script, I/O, example, recovery, safety, and current-state gates.
