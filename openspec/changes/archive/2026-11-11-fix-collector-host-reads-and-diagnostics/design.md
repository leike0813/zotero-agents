# Design

## Context

See proposal.md for the motivation. The three fixed Zotero baselines accept `getAnnotations()` only on `isFileAttachment()` objects. The collector's workspace injector supplies separate POSIX and CMD shims. Protocol validation already produces bounded schema diagnostics, but the business audit only projects these for `protocol_result_invalid`.

## Goals / Non-Goals

**Goals:** Repair the three existing boundaries through the agreed Broker API, collector runtime, and native-client audit test seams.

**Non-Goals:** Change snapshot completeness, repair library data, alter Synthesis business validation, publish packages, or resume the preserved real run.

## Decisions

- Skip non-file attachments before annotation reads, preserving their attachment count. Keep eligible read failures fatal instead of silently reporting unknown counts as zero; no MIME-based filtering or new DTO fields are needed.
- Keep explicit executable override priority. Reuse the research-bundle runtime's platform candidate ordering locally rather than introduce a cross-Skill dependency. Send query JSON on stdin (`--query -`) so CMD cannot expand percent variables or reinterpret quoting. Preserve payloads in receipts.
- Add optional `errorCode` to business audit details and retain existing classifications. Project registered protocol schema references and bounded keyword/pointer diagnostics for request and response failures. Reuse the protocol owner's schema-aware pointer sanitization so user-controlled keys cannot become log content. Do not log raw error details or payloads.
- Extend the existing 102, 173, and 220 tests in vertical red/green slices. Snapshot fixtures mix linked URLs, PDFs, and other file attachments; launcher checks include real Windows CMD execution; audit checks exercise the native composition and privacy boundary.

## Risks / Trade-offs

- Real file-attachment read errors still block complete snapshots by design; preserving accurate completeness is the user-approved policy.
- CMD can alter inline argument text; stdin isolates the structured query while fixed command arguments retain their current CLI meanings.
- Historical Synthesis failures lack their original requests; diagnostic improvement does not establish or repair an unobserved business root cause.
- Source and content changes take effect in installed runtimes only after separately arranged build and deployment.
