## Context

Host Bridge file registration currently obtains a complete `Uint8Array` before hashing when the caller does not provide SHA-256. Attachment capability mapping launches all registrations with `Promise.all`. Download repeats the complete read and digest, returns the bytes through an internal response DTO, and writes XPCOM output through 32 KiB slices converted to JavaScript number arrays. This preserves integrity but makes JavaScript memory and main-thread work scale with the largest files and attachment count.

The plugin runs in Zotero 7 and 9 without Node APIs. Node remains useful for deterministic tests, but the production implementation must use Gecko/XPCOM asynchronous streams and must not add OS.File access outside the existing compatibility boundary.

## Goals / Non-Goals

**Goals:**

- Bound JavaScript file buffers independently of file size.
- Keep attachment registration concurrency explicit and bounded while preserving result order.
- Preserve response bytes and all existing Host Bridge/CLI metadata and integrity behavior.
- Keep runtime-specific file operations behind one deep module with deterministic test instrumentation.

**Non-Goals:**

- Changing capability names, HTTP routes, CLI schemas, or approval policy.
- Governing large JSON response cloning and serialization (R11).
- Adding a user-facing transfer tuning preference or a whole-file fallback.

## Decisions

1. **Use a file-backed download DTO.** `HostBridgeResolvedFileDownload` carries a descriptor and `RuntimeFileTransferSource { path, size, sha256 }`; it never carries the full body. This makes the registry the authorization and metadata SSOT while the transfer module owns bytes.

2. **Use one conservative policy.** Hash reads and async-copy buffers use the existing 32 KiB transfer granularity. Attachment registration uses one worker. The values are module constants, not caller options, so every attachment route has the same memory and scheduling behavior.

3. **Use two bounded passes at download.** Before sending success headers, the transfer module asynchronously reads and digests the source and checks the registered size/hash. The server then asynchronously copies the verified file source to the socket. This preserves the current pre-response `file_unavailable` behavior without retaining a whole-file snapshot. A source mutation after headers is handled by the existing client length/checksum validation and retry contract.

4. **Keep backends inside the transfer boundary.** Node uses `fs.open/read` and incremental `crypto` only when `process` exists. Zotero uses `nsIFileInputStream` adapted to asynchronous pumping for digest and `nsIAsyncStreamCopier2` for output. Unsupported runtimes fail structurally; they do not read the complete file.

5. **Share incremental SHA state.** The SHA utility exposes an accumulator used by file transfer and existing byte-array hashing. The Zotero fallback converts at most one 32 KiB chunk for `nsICryptoHash.update`, eliminating file-sized `Array.from` allocations.

6. **Put global scheduling in the transfer boundary.** The file-transfer module owns one FIFO scheduler shared by registration digests, download verification, and response copies, so concurrent HTTP requests cannot multiply active file work. A file-specific registry batch entry point preserves attachment order; the capability layer does not own concurrency policy and no generic utility is introduced.

## Risks / Trade-offs

- **[Two reads increase disk I/O]** → Registration and download verification already read separately; the change bounds memory and yields main-thread work. Preserving pre-response integrity is prioritized over a single unverified send pass.
- **[Source mutates between validation and copy]** → The client already validates exact length and SHA-256 and retries once; the server closes failed transfers without publishing a successful JSON result.
- **[XPCOM lifecycle differs across Zotero versions]** → Exercise the same adapter in Zotero 7 and 9 and keep stream ownership/closure inside the transfer module.
- **[Test-only Node behavior masks plugin defects]** → Add a real-host fixture that verifies digest, delivery, event-loop progress, and cleanup rather than relying only on the Node shim.
