# Invocation And JSON Input

Read this reference before constructing structured CLI input.

## Choose the input channel

- Use an inline JSON value for a short, reviewed `--query` or `--input` payload.
- Use `@file` or the command's documented file argument for durable or generated payloads.
- Use stdin only when a pipeline intentionally owns the bytes and the command contract accepts it.
- Keep selection, workflow options, and provider profile in their separate arguments; never merge them into one guessed object.

`surface describe '<command>' --json` separates `invocationSchema` from `payloadSchema`. The first describes CLI flags and positional arguments. The second describes the decoded business object. Validate against both before execution.

## Pagination

Treat every cursor result as one page. Preserve page evidence before requesting `nextCursor`; stop when `hasMore` is false or the cursor is null. If interrupted, resume from the last accepted cursor and do not merge the preceding page twice.

## File output

When a result offers an output path, confirm overwrite policy before writing. When it returns `fileId`, use `file download`; a registered handle is not a local path. Verify checksum and byte count before using a downloaded or uploaded file as evidence.

## Secrets and paths

Do not place bearer tokens, backend credentials, base URLs, or local secret paths in workflow options or provider profiles. Do not send an arbitrary local path as a Zotero mutation target: upload the file, preserve its checksum, then pass the returned `fileId` to the approved mutation.
