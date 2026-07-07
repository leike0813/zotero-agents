## Why

Workflow build hooks can create provider input files before an ACP Skills run starts. Files written under Zotero's core temp directory can disappear when Zotero recreates that temp root, leaving long-running or resumed ACP sequences with stale absolute paths that fail local schema validation.

## What Changes

- Add a host API for materializing workflow input files under the plugin-managed runtime tmp root.
- Require buildRequest-generated provider input files to use the managed workflow input materialization API instead of Zotero core temp paths.
- Migrate builtin tag-regulator generated inputs and literature deep-reading source bundles to the managed API.
- Document `getTempDirectoryPath()` as ephemeral scratch storage, not durable provider input storage.

## Capabilities

### New Capabilities

- `workflow-input-file-materialization`: Managed materialization of files that workflow hooks generate for provider inputs.

### Modified Capabilities

- `workflow-execution-seams`: Workflow package hooks gain a stable host API contract for generated input files.
- `tag-regulator-workflow`: Tag-regulator generated `valid_tags` and digest markdown files use the managed workflow input materialization contract.

## Impact

- Host API surface: `runtime.hostApi.file.materializeWorkflowInputFile(...)`.
- Workflow runtime docs/types: host API version and file operation guidance.
- Builtin workflows: tag-regulator request helpers and literature deep-reading source bundle generation.
- Tests: host API file materialization, sequence request building, and literature deep-reading bundle generation.
