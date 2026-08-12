# Context

Discovery candidates currently reach update preflight as audit hints, but Stage 10 resolves only the agent-authored topic resolver. Resolver selectors may use intersection, so appending candidate paper refs is not a reliable inclusion path. Even when a candidate is inspected, the runtime has no explicit candidate-to-effective-membership decision and apply normalizes `accepted` back to `open`.

Concept ingestion currently adds canonical labels to alias sets, matches proposals through any exact alias, and updates match indexes after each proposal. The resulting decisions depend on batch order and treat lexical association as concept identity.

# Goals / Non-Goals

## Goals

- Preserve the existing resolver as the base source-membership mechanism.
- Give every bounded open discovery candidate an explicit triage outcome and effective-membership result.
- Make discovery outcome writes transactional with successful topic apply.
- Constrain aliases to interchangeable names for one concept and sense.
- Make Concept KB batch decisions independent of proposal order and reserve automatic merge for one exact canonical-label owner.
- Reuse the existing Concept Review Queue for deterministic alias conflicts and audits.

## Non-Goals

- Do not automatically include candidates without semantic triage.
- Do not infer concept equivalence with embeddings, token overlap, or a new model call inside the deterministic runtime.
- Do not automatically split or delete concepts and senses during alias audit.
- Do not redesign the topic resolver or discovery scoring algorithm.

# Decisions

## Candidate triage is a separate membership channel

Update preflight resolves the stored/proposed topic resolver unchanged. It separately resolves up to 25 open discovery paper references with a `paper_refs` union resolver, then presents the union to Stage 30. This avoids dependence on the base resolver's selector-combine mode.

The base resolved set is preserved. Discovery candidates not already linked are admitted only when Stage 30 classifies them `core` or `related`; `external`, `irrelevant`, and `unknown` remain outside the effective workset. Existing source papers are never removed because of candidate screening. The resolver manifest records the base set, candidate set, triage outcomes, unresolved candidates, and effective set as the apply contract.

## Discovery outcomes commit after topic artifacts

The runtime carries exact hint IDs and evidence bases into the resolver manifest. Topic apply updates those rows only after validation, CAS checks, and canonical artifact writes succeed. A failed or conflicted apply leaves hints unchanged.

`accepted` is a durable terminal state. `screened_out` is terminal only while its evidence basis still matches; a topic or literature metadata/profile/policy basis change may reopen it. `rejected` remains reserved for an explicit user decision and does not reopen automatically.

## Aliases are names, not related concepts

Stage 50 permits only abbreviations, expanded forms, spelling variants, and translations that are interchangeable in the same sense. Broader, narrower, component, task, method, dataset, benchmark, application, and merely associated terms are excluded. Empty alias arrays are valid and preferred when no equivalent form exists.

The payload schema requires the core concept fields, rejects unknown fields, limits and deduplicates aliases, and the instructions require a read-only Concept KB query before submission.

## Concept ingestion uses immutable batch preflight

All proposals are normalized and checked against a snapshot of canonical state and the complete batch before any write. One unique exact canonical-label match may merge automatically. Alias-only matches, multiple label owners, low-confidence proposals, duplicate batch labels, and label/alias ownership conflicts create review items with zero proposal writes.

This makes the decision invariant to proposal order and prevents the first proposal from changing how later proposals resolve.

## Alias audit reuses canonical review storage

An explicit Concepts-page action scans deterministic structural risks: aliases that collide with another concept's canonical label or owner, inconsistent concept/sense/alias records, and aliases representing a separately named sense. It creates deduplicated review items with `alias_conflict` or `alias_equivalence_audit` reasons and performs no automatic repair.

`keep_alias` closes the audit while retaining records. `remove_alias` removes the exact alias record and synchronizes the owning concept and all owning senses. Neither action deletes concepts or senses.

# Risks / Trade-offs

- More concept proposals may require review. This is intentional because false merges are harder to recover than deferred merges.
- A 25-candidate bound may require multiple update runs for large backlogs. The bound keeps preparation and Agent context predictable.
- Structural alias audit cannot prove semantic non-equivalence. It therefore proposes review rather than mutating data.
- Existing accepted/screened rows need compatible schema migration defaults; missing basis values are treated conservatively.

# Migration Plan

Repository initialization adds nullable discovery-basis and outcome columns without rewriting existing rows. Existing `open`, `rejected`, and `superseded` rows retain their meaning. Generated split-skill packages are refreshed from the canonical contracts and runtime, then compared against a temporary render.

# Open Questions

None.
