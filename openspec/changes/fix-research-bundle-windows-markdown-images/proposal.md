## Why

Research Bundle materialization currently forwards portable Windows drive paths such as `E:/research/figure.png` to Zotero filesystem APIs. Windows Zotero requires native local-path syntax at that boundary, so eligible Markdown images can be omitted or abort materialization for both the `export-research-bundle` workflow and direct CLI exports.

## What Changes

- Normalize Research Bundle Markdown source and image paths into Host-native syntax immediately before Zotero filesystem operations.
- Keep containment checks, rewritten Markdown links, manifest records, and archive entry names in the existing portable forward-slash namespace.
- Add regression coverage at the shared paper materializer and remote direct-export ZIP boundaries.
- Preserve the current warning and atomic-failure policies for unresolved images and accepted asset copy failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-platform-services`: Clarify that Host-owned Research Bundle materialization normalizes Markdown source and image paths before Zotero filesystem operations.
- `direct-research-bundle-export`: Require eligible Windows-host Markdown images to remain present in remotely delivered direct bundles.

## Impact

- Shared Research Bundle paper materialization in `src/modules/researchBundleService.ts`.
- Workflow and direct-export callers that already consume the shared materializer.
- Focused Node regression tests for Windows path ingress and remote ZIP delivery.
- No CLI arguments, capability names, manifest schemas, dependencies, or agent-facing Host Bridge surfaces change.
