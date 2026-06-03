## Why

The cluster-first canonical dedupe algorithm has been validated in the
Synthesis Index harness and fixes the noisy pairwise proposal behavior that
made production `canonical_merge` review hard to trust. Production Advanced
Reference Matching still calls the old pairwise dedupe function, so users do
not benefit from the new representative, eligibility, and structured
containment logic.

## What Changes

- Promote `dedupeCanonicalReferencesClustered()` into production
  `runAdvancedReferenceMatchingNow` external dedupe.
- Remove the old pairwise `dedupeCanonicalReferences()` API and test
  expectations.
- Keep refresh and workflow apply lightweight; they still must not call
  advanced/cluster dedupe.
- Store cluster redirect actions as canonical redirect facts and review actions
  as existing `canonical_merge` proposals.
- Update active docs/specs so the cluster algorithm is production policy, while
  the harness remains debug persistence only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-reference-resolution-matcher`: Advanced external dedupe uses the
  cluster-first algorithm as the sole canonical dedupe implementation.
- `synthesis-reference-sidecar-citation-graph`: graph-affecting facts are
  produced from cluster redirects while proposals remain review-only.
- `synthesis-reference-sidecar-index`: Review read models expose cluster
  evidence for `canonical_merge` proposals.
- `synthesis-workbench-ui`: Review UI continues using current proposal/fact
  model while showing cluster evidence.
- `synthesis-job-progress-reporting`: Advanced matching progress reports
  cluster/edge/action counters.
- `synthesis-persistence-performance`: production external dedupe keeps bounded
  block/pair budgets.
- `synthesis-invariant-guardrails`: guards enforce production cluster wiring
  and refresh/apply isolation.
- `synthesis-layer-doc-system`: active docs describe cluster dedupe as
  production policy.

## Impact

- Affects Synthesis matcher, service, docs, OpenSpec changes, and tests.
- No database schema change and no new public command.
- Harness remains a long-lived debug asset and shares the production cluster
  algorithm.
