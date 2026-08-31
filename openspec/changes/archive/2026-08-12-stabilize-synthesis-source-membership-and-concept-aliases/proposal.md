# Why

Topic updates can inspect strong discovery candidates without reliably carrying them into the final source-paper set. The candidate lifecycle also loses accepted state, so the same evidence can repeatedly appear open. Separately, Concept KB currently treats alias matches as automatic identity evidence and mutates its lookup maps while ingesting a batch; this can let the first proposal absorb later, merely related concepts.

# What Changes

- Make open discovery hints an explicit, bounded Stage 30 candidate set independent of the topic resolver combine mode.
- Admit candidates classified `core` or `related`, screen out other classifications, preserve the base resolver set, and commit hint outcomes only after a successful topic apply.
- Persist accepted and screened-out discovery outcomes with a comparison basis so changed evidence can reopen screening without erasing explicit user rejection.
- Tighten Stage 50 alias semantics and payload validation, and require a read-only Concept KB query before proposing concepts.
- Replace alias-driven automatic merging with batch-preflighted canonical-label matching; route alias conflicts and structurally suspicious existing aliases to the Concept Review Queue.
- Add explicit keep/remove actions for alias audit items and synchronize removal across concept, sense, and alias records.

# Capabilities

## Modified Capabilities

- `topic-synthesis-skills`: deterministic discovery-candidate membership and strict Stage 50 alias contracts.
- `topic-synthesis-workflows`: update intent and apply-time discovery lifecycle behavior.
- `synthesis-concept-kb`: order-independent ingestion, canonical-label-only automatic merging, and alias audit review.
- `synthesis-topic-graph`: discovery hint terminal states and evidence-basis reopening.
- `synthesis-tab-ui`: full-update routing for discovery candidates and alias audit controls.

# Impact

The change affects the split topic-synthesis runtime and generated builtin skills, the Synthesis repository/service, Concept KB ingestion and review handling, Workbench DTOs and controls, localized UI labels, focused regression tests, and Synthesis documentation. It adds no dependency and does not change existing explicit user rejection semantics.
