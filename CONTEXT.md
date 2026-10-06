# Zotero Agents

Zotero Agents presents literature and knowledge-work capabilities over a Zotero library, keeping durable derived knowledge distinct from source material while presenting workflow and agent activity through shared user-facing concepts.

## Language

**System End-to-End Test**:
A test that traverses a user-visible or public production path through a real Zotero process and the production plugin. When Synthesis is in scope, the current-source real Synthesis sidecar also participates; a controlled peer may replace only a system outside the boundary being tested.
_Avoid_: E2E directory test, full-suite test

**Contract Integration Test**:
A test that exercises a protocol or multi-module seam through production participants without traversing the complete System End-to-End path. Replacing the seam that carries the risk makes the evidence Contract Integration even when the test lives under an E2E directory or command.
_Avoid_: System E2E, unit test

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

**Dashboard Host**:
The Zotero-process owner that composes Task Dashboard state, snapshots, actions, frame lifecycle, refresh scheduling, and cleanup behind the stable `dashboardHost.ts` lifecycle interface. The page renderer and wire contract remain separate owners.
_Avoid_: Task manager dialog, Dashboard page, Dashboard wire contract

**Runtime Persistence Governance**:
The policy domain that observes plugin-managed runtime data, reports integrity issues, and controls category-, issue-, and age-based cleanup while excluding durable knowledge and user-authored content.
_Avoid_: Runtime filesystem, persistence adapter, state store

**Zotero Host Capability Broker**:
The canonical process-local, JSON-safe capability interface for Zotero context, navigation, bounded library reads, metadata translation, and controlled mutations. It owns host capability semantics but not transport, authorization, approval, exposure, or remote file locality.
_Avoid_: Workflow hostApi, Host Bridge API, MCP tool registry

**Host Bridge Server**:
The embedded HTTP lifecycle owner for listener binding, authorization, request admission, operation replay, socket ownership, and shutdown. Private route adapters own path matching and route-family handling; the server does not define Zotero capability semantics.
_Avoid_: Host Bridge API, capability registry, generic HTTP router

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

**Literature Retrieval Result**:
A literature-level search match identified by its source library and item, distinct from the individual source excerpts that support the match.
_Avoid_: Chunk result, vector record

**Retrieval Evidence Fragment**:
A locatable excerpt from an included Zotero library literature source or analysis artifact, retaining its owning literature identity and source kind. Its origin distinguishes original material from generated analysis; a generated excerpt is not original-paper evidence.
_Avoid_: Paper quote without provenance, vector record

**Topic Retrieval Result**:
A Topic-level search match identifying canonical Topic content. An excerpt may explain the match while retaining its identity as synthesized content.
_Avoid_: Similar paper, evidence fragment

**Similar Literature Recommendation**:
A literature recommendation for reading based on the research content of one reference paper. It is distinct from literature selected to answer a caller's explicit research question.
_Avoid_: Citation neighbor, associated Topic, duplicate paper

**Topic Discovery Candidate**:
A literature suggestion for a Topic's defined research interests that has not been adopted into its sources. A candidate is distinct from the Topic's synthesized conclusions and remains subject to its review decisions.
_Avoid_: Topic source paper, accepted evidence, Topic freshness

**Retrieval Application**:
The owner of derived retrieval corpus projections, index spaces, basis-bound query views and results, and internal rebuild publication. Original source facts and the public maintenance operation lifecycle have separate owners.
_Avoid_: Vector database facade, Synthesis page search

**Retrieval Projection**:
A rebuildable, potentially stale representation of included source material for retrieval, retaining source identity, kind, locator, revision, and embedding configuration identity alongside the metadata, excerpts, and vectors needed for search. Zotero and canonical Topic owners remain authoritative for the original facts.
_Avoid_: Library mirror, current-source authority, vector record

**Retrieval Embedding Configuration**:
A saved choice of embedding service connection, model ID, and query/document encoding settings for retrieval. It is distinct from the Agent's chat model configuration. The current Synthesis data root has one published vector index bound to a model ID and its encoding settings; compatible service connections can be switched without rebuilding that index.
_Avoid_: Chat default, Agent backend, vector database connection
