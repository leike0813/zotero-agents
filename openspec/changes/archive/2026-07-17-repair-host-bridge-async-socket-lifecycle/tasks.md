## 1. Regression Tests

- [x] 1.1 Replace the reader AbortSignal test seam with a reader-owned operation contract and add XPCOM event-target/cancellation coverage.
- [x] 1.2 Add socket lifecycle regressions for an absent global AbortController, partial initialization failure, successful response release, and accepted-connection registry cleanup.
- [x] 1.3 Remove the real-Zotero response fallback and require raw health, upload, and MCP response bytes.

## 2. Runtime Repair

- [x] 2.1 Implement the cancelable Host HTTP read operation and XPCOM main-thread event-target resolution without a synchronous fallback.
- [x] 2.2 Make accepted-connection initialization exception-safe and separate successful release from abort cleanup.
- [x] 2.3 Preserve response serialization while preventing immediate successful transport close and retaining generation-safe shutdown behavior.

## 3. Evidence and Validation

- [x] 3.1 Update the R2 audit record with the production root cause, prior oracle gap, repair boundary, and honest Zotero-version evidence.
- [x] 3.2 Run focused Node tests, the real Zotero socket fixture, lint, build, and strict OpenSpec validation.
- [x] 3.3 Cold-restart Zotero, verify CLI 0.2.1 first-request and repeated Host Access responses, and confirm persistent CLOSE_WAIT connections are absent.
