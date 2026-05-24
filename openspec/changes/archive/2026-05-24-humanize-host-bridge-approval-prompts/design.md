## Context

Host Bridge uses one permission manager for both global Zotero prompts and ACP
skill-run scoped approvals. The permission manager only displays the supplied
`title`, `summary`, and `detail`; it does not know enough about workflow or
mutation payloads to translate them into user-facing language.

The current workflow and capability call sites pass pretty-printed JSON as
`detail`, which is useful for debugging but poor for approval. Users need to
know what will happen, where the request came from, and what kind of Zotero data
may change.

## Approach

- Generate approval copy at the call sites that understand the operation:
  workflow submit in `hostBridgeWorkflowControl` and capability call in
  `hostBridgeServer`.
- Keep the permission manager unchanged so approval routing, timeouts, and
  test hooks remain stable.
- Use concise plain text lines for details. Avoid raw JSON, braces, and full
  request dumps in primary approval text.
- For workflow approvals, include workflow label/id, source, and input shape.
- For mutation approvals, include the operation category, target count, and
  small readable previews such as tag names or field names.
- For unknown future capabilities, fall back to a generic but still
  human-readable Host Bridge action prompt.
- Update the dashboard label to "View details" because the detail area is no
  longer intended to be a full machine request dump.

## Edge Cases

- Unknown workflow inputs or future mutation shapes should still produce a
  safe generic prompt.
- Long lists such as many tags or fields should be summarized with a short
  preview and remaining count.
- The prompt text should avoid local paths and raw payload structures; transport
  responses and logs remain the place for machine diagnostics.

## Non-goals

- Do not change approval decisions, timeout behavior, or scope handling.
- Do not add a verbose approval mode.
- Do not remove structured request data from CLI responses or internal logs
  outside the approval UI boundary.
