## 1. Lock the Zotero source-identity regression

- [x] 1.1 Extend the sidecar fake window and success fixtures to exercise production-shaped `publisherWindow` and `MessageEvent.source` inputs.
- [x] 1.2 Add failing cases for absent source, direct and wrapped-equivalent publishers, and a verifiably unrelated non-null publisher.
- [x] 1.3 Add a Zotero-only nested Assistant Workspace frame regression covering rendered ACP Chat and ACP Skills publication with state cleanup.

## 2. Correct publication source validation

- [x] 2.1 Implement safe direct/`wrappedJSObject` window equivalence inside the debug-exclusive sidecar.
- [x] 2.2 Accept absent sources while retaining wrong-source, tab, revision, frame-replacement, timeout, abort, unload, and rAF behavior.

## 3. Verify isolation and behavior

- [x] 3.1 Run sidecar, Replay profiler/controller/logical-time, Workspace UI/DOM, and Zotero runtime regressions.
- [x] 3.2 Run release-elision, typecheck, targeted lint/format checks, diff checks, and strict OpenSpec validation.
