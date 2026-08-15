# Zotero Agents

Zotero Agents presents workflow and agent activity through shared user-facing concepts while allowing execution backends to retain their own lifecycle semantics.

## Language

**ACP Tool Display Projection**:
The normalized display state derived from ACP tool-call reports and used consistently by ACP Chat, ACP Skills, transcript previews, and tool rows.
_Avoid_: Tool text helper, mirror-specific tool display

**Workflow Job Terminal Resolution**:
The conclusion reached for a workflow job after considering local execution and canonical lifecycle facts: missing, pending, locally ready, or canonically ready.
_Avoid_: Terminal outcome, completion, job state
