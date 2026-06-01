## Context

The canonical Synthesis Layer design has been consolidated under
`doc/synthesis-layer`. Several active OpenSpec specs still reflect older design
iterations and would lead implementers toward behavior that the current design
explicitly rejects.

## Goals / Non-Goals

**Goals:**

- Make active OpenSpec requirements consistent with the latest design docs.
- Remove requirements that imply `paper_ref` is the default intellectual-work
  identity.
- Remove discovery hint `accepted` and `filtered` semantics from requirements.
- Require graph and other Registry-dependent derived outputs to pass a final
  transaction-local basis check before becoming visible.
- Require related-items sync to use durable outbox/provenance, not in-memory echo
  markers as the correctness mechanism.

**Non-Goals:**

- No runtime implementation changes.
- No schema migration.
- No new tests beyond OpenSpec validation.

## Decisions

- `doc/synthesis-layer` is the implementation contract source for the reviewed
  design; OpenSpec specs should capture testable requirements from it.
- Specs must not preserve historical terminology that is now semantically wrong,
  including Index-as-registry wording, accepted discovery hints, and
  `paper_ref`-derived literature identity.
- Phase-specific behavior will be implemented in later changes; this change only
  aligns the spec baseline.

## Risks / Trade-offs

- Updating active specs first may make current implementation appear further out
  of compliance. That is intentional: the later implementation changes close the
  gaps in a controlled order.
