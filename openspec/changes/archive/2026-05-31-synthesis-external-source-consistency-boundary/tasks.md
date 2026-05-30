## 1. OpenSpec Artifacts

- [x] 1.1 Create the `synthesis-external-source-consistency-boundary` change.
- [x] 1.2 Add proposal, design, and spec artifacts for external source consistency boundaries.

## 2. Governance Documents

- [x] 2.1 Update domain governance with optimistic/default, defensive-ingress, fail-closed drift policy.
- [x] 2.2 Update event and impact contracts so startup reconcile is a bounded detector and bulk drift does not expand to per-item fan-out.
- [x] 2.3 Update rebuild contracts with explicit rebuild/repair recovery after bulk or structural drift.
- [x] 2.4 Update trigger/read-model/UI docs with source drift incident behavior and recommended commands.

## 3. Engineering Contracts

- [x] 3.1 Add source drift classification to engineering event contracts and `events.yaml`.
- [x] 3.2 Add a startup reconcile source-drift sequence.
- [x] 3.3 Add failure recovery and invariant YAML entries for bulk drift no-fanout and ingress validation.

## 4. Verification

- [x] 4.1 Run OpenSpec validation for `synthesis-external-source-consistency-boundary`.
- [x] 4.2 Run formatting checks for touched Markdown and YAML.
- [x] 4.3 Run source-text checks for missing/contradictory startup reconcile fan-out wording.
