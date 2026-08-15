# Zotero Agents

Zotero Agents presents literature and knowledge-work capabilities over a Zotero library while keeping durable derived knowledge distinct from its source material.

## Language

**Reference**:
The literature-linking domain that covers extracted source citations, their canonical identities, matching decisions, review, and derived projections.
_Avoid_: Reference canonical, reference subsystem

**Source Reference**:
A citation or bibliographic claim extracted from one source item before canonical identity is resolved.
_Avoid_: Raw row, reference record

**Canonical Reference**:
The durable identity that unifies equivalent Source References and may be bound to a Zotero library item.
_Avoid_: Canonical record, merged reference

**Reference Match Proposal**:
A durable recommendation to bind a Source Reference to a library item or to redirect one Canonical Reference to another, pending an applicable decision.
_Avoid_: Match row, proposal record

**Reference Projection**:
A derived, readable view of current Reference facts for indexing, ranking, attention, or review.
_Avoid_: Reference JSON, read model row

**Citation Graph Application**:
The deep module that owns basis-bound Citation Graph reads, graph rebuild attempts, metrics and layout identity, and atomic graph/cache/attempt promotion over the local repository.
_Avoid_: Citation graph repository facade, runtime graph store
