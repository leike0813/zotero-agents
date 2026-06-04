## Why

Host Bridge request bodies with non-ASCII JSON can be decoded as byte strings instead of UTF-8 text, which has already caused Chinese note HTML written through `zotero-bridge` to persist as mojibake. The same string-body HTTP parser pattern also exists in the embedded Zotero MCP server.

Separately, `synthesis.resolve_resolver` is documented too loosely for agents. It requires an input object containing a top-level `resolver` field, but agents can reasonably interpret current guidance as accepting `topic_resolver`, root-level `queries`, or the resolver object itself. The resulting error (`$ must be an object`) is misleading.

## What Changes

- Parse Host Bridge and Zotero MCP HTTP request bodies from bytes using `Content-Length`, then decode the body as UTF-8.
- Report malformed UTF-8 as structured request errors instead of allowing silent mojibake.
- Make `synthesis.resolve_resolver` missing-input errors point at `$.resolver`.
- Keep the resolver contract hard-cut: no `topic_resolver` alias and no root-level `queries` inference.
- Update CLI help, injected agent manual/prompt, MCP description, docs, and specs to show `{ "resolver": ... }` as the only accepted input contract.

## Capabilities

### Modified Capabilities

- `host-bridge-cli-interface`: CLI-to-bridge JSON transport is UTF-8 safe and resolver input guidance is explicit.
- `host-bridge-cli-synthesis-subcommands`: `resolve-resolver` requires `{ resolver: canonicalResolver }`.
- `zotero-host-broker-capability-api`: Host Bridge request body decoding is byte-based and UTF-8 strict.
- `zotero-mcp-tool-suite`: Embedded MCP request body decoding is byte-based and UTF-8 strict.
- `synthesis-layer-mvp`: Resolver validation errors identify the required `resolver` field.
- `synthesis-layer-doc-system`: Active docs and prompts describe the same resolver input contract.

## Impact

Affected areas are the Host Bridge HTTP parser, embedded Zotero MCP HTTP parser, Synthesis resolver diagnostics, CLI help/docs, ACP runtime prompt/manual, and targeted Host Bridge/MCP/Synthesis tests. No resolver algorithm, database schema, or workflow bundle shape changes are included.
