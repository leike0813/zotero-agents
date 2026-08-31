## Context

See `proposal.md` for motivation. `researchBundleService.ts` owns canonical paper materialization for both the workflow Host API and direct Research Bundle capabilities. Its Markdown image resolver deliberately uses forward-slash paths for URL parsing, containment, and portable output, but those same strings currently reach runtime file primitives. The existing platform SSOT `normalizeNativeLocalPath` already defines how supported native paths, Windows drive-slash paths, and standard local file URLs cross into Zotero IO.

## Goals / Non-Goals

**Goals:**

- Restore Host-native filesystem inputs without changing the portable Research Bundle namespace.
- Keep workflow and direct export on the same shared materialization path.
- Lock the caller-visible materialization and remote archive behavior with focused tests.

**Non-Goals:**

- Expanding support to UNC paths or non-standard `file://C:/...` forms.
- Changing CLI routing, capability contracts, manifest schemas, Product layouts, or warning codes.
- Globally changing runtime persistence path semantics.

## Decisions

1. Normalize at the Research Bundle filesystem ingress. The service will use `normalizeNativeLocalPath` only when passing the Markdown source or an accepted image to runtime probe, read, and copy operations. Portable parsing and containment retain their current forward-slash representation. Changing `runtimePathExists` globally was rejected because it has unrelated callers and a deliberate non-native-path guard in Node fallback environments.
2. Keep two path representations with existing responsibilities. Resolved portable paths remain the source of truth for containment, source-relative paths, rewritten links, manifest entries, and ZIP paths; a native path is derived from the accepted local path solely for Host IO. This avoids leaking Windows separators into portable artifacts.
3. Preserve failure classification. A path that cannot be normalized or probed before asset acceptance remains optional material: the original Markdown destination is retained and `markdown_image_missing` is recorded. A later copy failure for an accepted asset continues to abort atomic publication.
4. Test public service seams. A materializer test supplies filesystem-boundary doubles and asserts observable paper material plus the native paths received by Zotero IO. A remote publisher test uses real temporary files, the archive API, and the file registry to prove that the delivered ZIP contains the image bytes. CLI argv tests are unnecessary because routing and wire contracts do not change.

## Risks / Trade-offs

- [Native normalization accidentally changes portable paths] → Keep native values local to filesystem calls and assert forward-slash asset/link output.
- [Linux Node tests misinterpret Windows paths] → Mock only the Zotero filesystem boundary for the Windows case; use a real POSIX fixture for archive delivery.
- [A broader path fix changes unrelated runtime callers] → Do not modify shared runtime persistence probes or CLI-side path handling.
- [Optional-image errors become hard failures] → Retain the existing warning boundary before asset acceptance and test the successful path independently from archive atomicity.

## Migration Plan

No data or schema migration is required. Ship the service fix with its tests. Rollback restores the previous service implementation; existing Products, direct bundles, and file registry entries remain format-compatible.
