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

**Zotero Host Capability Broker**:
The canonical process-local, JSON-safe capability interface for Zotero context, navigation, bounded library reads, metadata translation, and controlled mutations. It owns host capability semantics but not transport, authorization, approval, exposure, or remote file locality.
_Avoid_: Workflow hostApi, Host Bridge API, MCP tool registry

**Workflow Host API Projection**:
The explicit member-level projection from the canonical broker into `WorkflowHostApi` v12, combined with trusted local workflow services and raw Zotero ref normalization. It is a separate compatibility surface and must not receive whole broker domains implicitly.
_Avoid_: Broker alias, common host API, universal host facade

**Workflow Host Contract Identity**:
The current Workflow Host version and its declared top-level capabilities and diagnostic flags. Package compatibility ranges, hook execution modes, and observed runtime availability are separate concepts.
_Avoid_: Capability summary, package compatibility policy, hook execution mode

**Workflow Host Contract Variant**:
The interactive or non-interactive availability rules applied to the Workflow Host API Projection. A variant defines which declared capabilities must be present without changing how workflow hooks are loaded.
_Avoid_: Hook execution mode, package load mode, runtime backend

**Research Bundle Materialization**:
The canonical conversion of selected paper refs into portable metadata, one preferred source, the standard analysis artifacts, and structured per-paper availability diagnostics. Selection roles, Product layout and registration, and direct-export delivery are separate concerns.
_Avoid_: Workflow bundle builder, direct-export packager, Research Bundle service

**Host Bridge Locality Projection**:
The sole remote-boundary conversion of process-local attachment DTOs into path-free opaque file handles or unavailable access descriptors. MCP reuses this projection through the Host Bridge capability handlers.
_Avoid_: MCP attachment adapter, localhost path mode, path passthrough
