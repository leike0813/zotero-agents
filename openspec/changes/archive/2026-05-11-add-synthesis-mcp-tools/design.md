# Synthesis MCP Tools Design

## Overview

Synthesis MCP tools are job-time host capabilities for ACP Skills agents. They
run through the existing embedded Zotero MCP JSON-RPC protocol and use the same
tool registry, queueing, structured result, and text disclosure conventions as
the existing Zotero tools.

The protocol is extended with an injectable `resolveSynthesisService` option.
The service returns DTOs only. The MCP protocol does not expose raw Zotero
objects and does not write formal Synthesis assets.

## Tools

v1 job-time tools:

- `synthesis.get_topic_context`
- `synthesis.get_schemas`
- `synthesis.get_library_index`
- `synthesis.validate_resolver`
- `synthesis.resolve_resolver`
- `synthesis.get_paper_registry`
- `synthesis.query_citation_graph`
- `synthesis.get_paper_artifact_manifest`
- `synthesis.read_paper_artifacts`

All tools are read-only. Any missing service method returns a structured tool
input error instead of silently fabricating data.

## Input Rules

- MCP inputs reject unknown top-level fields via existing `objectSchema`
  `additionalProperties: false`.
- Large resources use cursor, limit, or item key batching.
- Resolver validation and execution accept declarative resolver DTOs but do not
  let agents write the resolver into canonical assets.

## Output Rules

Each tool returns:

- actionable `content[0].text`
- `structuredContent.tool`
- DTO payload under a tool-specific key

Text disclosure must include enough ids/refs for follow-up calls: topic id,
paper refs, registry counts, graph slice counts, artifact refs, or cursor state.

## Service Boundary

The service contract is intentionally narrow:

```ts
type SynthesisMcpService = {
  getTopicContext(args): unknown;
  getSchemas(args): unknown;
  getLibraryIndex(args): unknown;
  validateResolver(args): unknown;
  resolveResolver(args): unknown;
  getPaperRegistry(args): unknown;
  queryCitationGraph(args): unknown;
  getPaperArtifactManifest(args): unknown;
  readPaperArtifacts(args): unknown;
}
```

Later phases wire the service to real storage, registry, graph, and artifact
readers. This change validates protocol shape and agent-facing contracts.
