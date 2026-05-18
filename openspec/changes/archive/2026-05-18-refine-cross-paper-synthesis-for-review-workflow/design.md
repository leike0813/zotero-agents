# Design

## Runtime Shape

Stage 4 validates enhanced paper analysis rows. Each row is a paper unit with
paper-local facts only: research problem, method contribution, evaluation
context, findings, limitations, taxonomy hints, comparison facts, and
candidate claims/timeline rows. These rows must not compare across papers or
write final taxonomy.

After Stage 4, scripts generate `runtime/views/cross-paper-evidence-index.json`
from validated paper units and manifest facts. The index is mechanical and
contains no script-authored semantic synthesis.

Stage 5 first asks the LLM to write
`runtime/payloads/cross-paper-evidence-map.json`. The evidence map aggregates
paper units into taxonomy candidates, comparison dimensions, claim candidates,
debate candidates, gap candidates, and review outline seeds. Runtime validation
checks that all paper-unit references and required candidate references exist.

Only after evidence-map validation may the LLM write final section files.

## Final Sections

The complete artifact contract adds:

- `positioning`
- `taxonomy`
- `comparison_matrix`
- `debates`
- `review_outline`
- `evidence_map`

Existing sections remain, but `claims`, `timeline_events`, and `gaps` gain
evidence-map references and stricter evidence semantics.

## Evidence Rules

- Claims must cite `paper_evidence` and evidence-map candidates.
- Taxonomy nodes must cite evidence-map candidates.
- Comparison rows must cite evidence-map candidates.
- Debates must cite evidence-map candidates and name an evidence type.
- Gaps must have a gap type and cite evidence-map candidates.
- External literature can support background, prior-review, method-antecedent,
  or benchmark context, but cannot be primary evidence for library-paper
  claims.

## Review Workflow Boundary

This change makes topic synthesis review-ready but does not write review prose.
The review workflow should consume positioning, taxonomy, comparison matrix,
debates, gaps, review outline, paper evidence, and external literature analysis
through `synthesis.get_review_input`.
