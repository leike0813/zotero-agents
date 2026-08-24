# Zotero Agents

Zotero Agents presents literature and knowledge-work capabilities over a Zotero library, keeping durable derived knowledge distinct from source material while presenting workflow and agent activity through shared user-facing concepts.

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

**ACP Tool Display Projection**:
The normalized display state derived from ACP tool-call reports and used consistently by ACP Chat, ACP Skills, transcript previews, and tool rows.
_Avoid_: Tool text helper, mirror-specific tool display

**Workflow Job Terminal Resolution**:
The read-only interpretation of one workflow job's local queue and canonical lifecycle facts, yielding both a terminal conclusion (missing, pending, locally ready, canonically ready) and a normalized slot status for the run seam.
_Avoid_: Terminal outcome, completion, job state
