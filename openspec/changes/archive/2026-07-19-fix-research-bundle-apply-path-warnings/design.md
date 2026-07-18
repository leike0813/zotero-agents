## Context

Literature Workbench hooks can receive Markdown image destinations in URL-shaped Windows form. The shared Host file surface currently forwards those strings directly to Zotero IOUtils, while the Markdown image rewriter only handles a resolver returning no path and not a resolver rejection. This lets an optional image probe abort Research Bundle apply. Separately, the apply seam discards successful hook return values, so Product warnings are not visible in runtime logs.

The repository already has a native-path SSOT in `normalizeNativeLocalPath`, shared Product atomic persistence, and specifications requiring unreadable Markdown images to remain warnings. The fix must preserve those boundaries and remain backend- and workflow-agnostic.

## Goals / Non-Goals

**Goals:**

- Normalize local filesystem inputs before Zotero/runtime file operations.
- Keep optional Markdown image failures outside the Product asset set and downgrade them to existing warning semantics.
- Expose a bounded structured warning summary on successful apply logs.
- Preserve strict failure for required file operations and accepted Product asset copy failures.

**Non-Goals:**

- Adding UNC Markdown destination support, a new Host API method/version, or Workspace warning UI.
- Changing existing missing Topic, paper, core-source, or Product atomicity policies.
- Logging full warning objects, local paths, or unrestricted error messages.

## Decisions

1. Extend `normalizeNativeLocalPath` rather than introduce package-local separator logic. Host file operations and Product local-file ingestion independently normalize at their public ingress because either can receive data from third-party workflows.
2. Treat `file.exists` as a total probe: malformed/inaccessible inputs return `false`. Required reads, writes, and copies still reject, so operational failures are not hidden.
3. Catch Markdown image resolver failures in the shared rewriter and reuse `markdown_image_missing` with a stable reason field. A new warning code would contradict the current specification and fragment consumers.
4. Keep `executeApplyResult` transparent. Hooks may return reserved `applyDiagnostics`; a shared normalizer extracts only non-negative warning counts and bounded code counts for all apply-success branches.
5. The Product manifest remains the complete warning SSOT. Runtime logs contain counts only, and apply success with warnings uses warning severity without changing its success stage/outcome.

## Risks / Trade-offs

- Normalizing all Host file operations broadens accepted inputs. → Cover native, drive-slash, local file URL, malformed URL, and IOUtils rejection paths in shared tests.
- Existence probes collapse inaccessible and absent files to `false`. → Strict operations still reject, while optional callers already require a boolean probe contract.
- Concurrent source deletion after a successful probe can still fail Product copy. → Preserve atomic rollback for this TOCTOU case.
- Diagnostics could become an unbounded log channel. → Accept only numeric totals and bounded code-count maps; keep full warning context in the manifest.
