# Zotero Agents

Zotero Agents presents workflow and agent activity through shared user-facing concepts while allowing execution backends to retain their own lifecycle semantics.

## Language

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
The explicit member-level projection from the canonical broker into `WorkflowHostApi` v11, combined with trusted local workflow services and raw Zotero ref normalization. It is a separate compatibility surface and must not receive whole broker domains implicitly.
_Avoid_: Broker alias, common host API, universal host facade

**Host Bridge Locality Projection**:
The sole remote-boundary conversion of process-local attachment DTOs into path-free opaque file handles or unavailable access descriptors. MCP reuses this projection through the Host Bridge capability handlers.
_Avoid_: MCP attachment adapter, localhost path mode, path passthrough
