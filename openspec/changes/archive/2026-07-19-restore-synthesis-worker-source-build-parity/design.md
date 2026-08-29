## Context

`packages/synthesis-engine/src/topicGraphIndex.ts` is both a source-executed
Worker entrypoint dependency and an input to the Synthesis service build. Its
two relative runtime references currently spell `topicGraphCore.js`. That is
correct only after compilation: the source tree contains
`topicGraphCore.ts`, so direct TypeScript Worker execution fails before the
engine can process a request.

The service build already owns relative extension conversion through
`rewriteRelativeImportExtensions`. The source module therefore needs to state
the source-level dependency, while the build remains the single authority for
the emitted Node ESM dependency.

## Goals / Non-Goals

**Goals:**

- Restore direct source Worker execution for the Topic Graph index engine.
- Preserve native `.js` relative references in compiled service output.
- Lock direct/Worker result parity with focused source and compiled canaries.
- Preserve the public service inventory and package contents.

**Non-Goals:**

- Changing Worker launchers, package exports, TypeScript configuration, DTOs,
  algorithms, RPC, persistence, dependencies, or runtime/XPI assets.
- Adding source-tree JavaScript shims or a second extension rewrite path.
- Generalizing the fix to unrelated cross-package deep imports.

## Decisions

1. **Use `.ts` in the source runtime import and re-export.** The direct source
   Worker must resolve the file that actually exists. A `.js` shim was rejected
   because it would duplicate the source/build contract and create generated
   artifacts in the source tree.
2. **Keep `rewriteRelativeImportExtensions` as the extension SSOT.** The
   existing service build converts source-relative `.ts` specifiers to emitted
   `.js` specifiers. Changing the compiler or package exports would broaden the
   fix beyond the defective module boundary.
3. **Restore the direct Worker canary instead of introducing a new harness.**
   The deleted fixture already exercises the observable failure boundary. The
   canary compares its rebuilt Worker result with direct in-process execution,
   while existing build canaries cover emitted execution and packaging.
4. **Use focused parity assertions.** Tests lock module resolution, semantic
   result equality, emitted extension shape, and the existing service inventory;
   they do not lock internal call order or incidental text.

## Risks / Trade-offs

- **A future build bypasses extension rewriting** → Keep a build assertion that
  emitted `topicGraphIndex.js` references `topicGraphCore.js` and contains no
  runtime `.ts` specifier.
- **A source canary passes through an unintended compiled fallback** → Launch
  the restored fixture directly from the source test path and keep the source
  tree free of `.js` shims.
- **The focused fix hides broader import-boundary debt** → Limit this change to
  the reported Topic Graph failure and retain broader dependency governance as
  a separate self-review item.
