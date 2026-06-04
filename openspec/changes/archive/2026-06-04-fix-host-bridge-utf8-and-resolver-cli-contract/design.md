# Design

## UTF-8 Request Parsing

Host Bridge and Zotero MCP server sockets read raw request bytes. Header parsing treats bytes as HTTP header text, while the body is selected by `Content-Length` and decoded with UTF-8 before JSON parsing.

The request DTO still exposes `body: string` to handlers, but it also carries `bodyByteLength` for request-size enforcement. Size limits compare bytes, not JavaScript string length.

Malformed UTF-8 produces a structured bad-request response before JSON parsing. The response wire format remains unchanged.

## Resolver Input Contract

`synthesis.resolve_resolver` accepts only:

```json
{
  "resolver": {
    "mode": "tag_query",
    "query": "tag-name"
  }
}
```

`topic_resolver` remains a workflow bundle field and is not accepted by Host Bridge, MCP, or CLI synthesis resolver calls. When the `resolver` field is missing or non-object, the service returns `$.resolver is required and must be an object`, with an additional hint when `topic_resolver` is present.

## CLI and Agent Guidance

The CLI continues to send normal UTF-8 JSON and does not escape all non-ASCII characters. Agent-facing docs and prompt templates show the resolver wrapper object explicitly and list common rejected shapes.
