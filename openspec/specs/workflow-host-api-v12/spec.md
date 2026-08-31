# workflow-host-api-v12 Specification

## Purpose

Defines the complete trusted in-process Workflow Host API v12 interface, its exact identity and variants, the owner projections behind every member, and the hard removal of legacy host access paths.
## Requirements
### Requirement: Workflow Host SHALL expose one exact v12 surface
The active Workflow Host interface SHALL contain metadata values `version: 12` and `interactionMode: "interactive" | "non_interactive"`, plus exactly the twenty-one nested modules and callable members below. No listed module or member is optional.

```text
addon: getConfig
environment: getInfo
context: getCurrentView, getSelectedItems
navigation: openItem, openNote, openCollection, openSelection
library: listItems, traverseItems, withItemSnapshot, listCollections,
  getItemDetail, getItemNotes, getNoteDetail, listNotePayloads,
  getNotePayload, getItemAttachments, listAnnotations, exportPortableItems
metadata: translateIdentifier
mutations: preview, execute
notes: create, updateContent, remove, upsertPayload
images: prepareForNoteEmbedding
attachments: create, updateMetadata, replaceFile, move, remove
bibliography: listFormats, render
researchBundles: materializePapers, importPapers
statusTags: getPolicy, transition
file: readText, writeText, readBytes, writeBytes, copy, exists,
  makeDirectory, materializeWorkflowInputFile, getTempDirectoryPath,
  pickDirectory, pickFile, pickSaveFile, pickFiles, stat, list, move, remove
archive: measureEntries, writeZipAtomic, withExtractedZip
resources: getInput, getInputs, get, materializeFile, allocateOutput, publishOutput, listOutputs
clipboard: readText, writeText, hasText, clear
editor: openSession
notifications: toast
logging: appendRuntimeLog
synthesis.workflowApply: applyLiteratureDigest, applyTopicPlan,
  applyTopicSynthesisResult
synthesis.topics: getReport
synthesis.artifacts: readPaperArtifacts
synthesis.tags: loadVocabulary, saveVocabulary, exportVocabularyForRegulator,
  listStagedSuggestions, stageSuggestions, promoteStagedSuggestions,
  discardStagedSuggestions, withAuditRun, acknowledgeRegulation
```

The manifest SHALL measure 23 top-level keys, including two metadata values and twenty-one nested modules, and 87 callable members. Synthesis grouping keys SHALL not count as callable members.

#### Scenario: Interactive projection is inspected
- **WHEN** recursive conformance inspects every top-level and nested key
- **THEN** the projection has exactly the declared 23/21/87 identity and every callable position is a function

#### Scenario: Undeclared member is exposed
- **WHEN** composition, Broker growth, or a spread adds a top-level or nested member
- **THEN** contract conformance fails before the build can publish the projection

### Requirement: Contract variants SHALL differ only in execution behavior
Interactive and non-interactive adapters SHALL expose the same exact v12 surface. UI-dependent members in the non-interactive adapter SHALL fail with `interaction_required`; runtime dependency failure SHALL use the stable error taxonomy rather than removing a member or publishing availability flags.

#### Scenario: Non-interactive picker is called
- **WHEN** a non-interactive workflow invokes `file.pickFile`
- **THEN** the member exists and fails with `interaction_required` naming `file.pickFile`

#### Scenario: Synthesis runtime is unavailable
- **WHEN** the Synthesis adapter cannot resolve its runtime
- **THEN** every Synthesis member remains present and the attempted call reports the closed unavailable outcome

### Requirement: V12 member signatures SHALL preserve closed DTO and control semantics
Every member SHALL use the exact request, result, nullability, callback, and `WorkflowCallControl` shape defined by the v12 contract and owner delta specs. Public request/result data SHALL be strict JSON except for the closed trusted in-process value list.

#### Scenario: Callback-scoped member is invoked
- **WHEN** a caller invokes traversal, snapshot, archive extraction, or tag audit
- **THEN** control and callback occupy their declared parameters and no overload interprets a request bag as control

### Requirement: V12 activation SHALL be a hard compatibility cut
The v12 surface SHALL NOT contain `items`, `prefs`, `parents`, generic `tags`, generic `collections`, `command`, legacy `literature`, optional `resources`, optional `synthesis`, flat Synthesis aliases, `items.getAll`, or v11 operation aliases. No v2-v11 fallback or compatibility adapter SHALL be installed.

#### Scenario: Removed member is called by a migrated package
- **WHEN** governance scans official Workflow packages after activation
- **THEN** no package references a removed member or includes a legacy host-version branch

#### Scenario: Unknown old mutation name is submitted
- **WHEN** a caller submits a removed handler-shaped operation name
- **THEN** the v12 owner returns `unsupported_operation` rather than mapping it to a compatibility alias

### Requirement: Workflow Host SHALL be a closed composition root
Host composition SHALL project named owner members through explicit readonly object literals and deny adapters. It MUST NOT use spread, proxy, dynamic capability catalogs, whole-domain aliases, or runtime discovery to define public identity. Domain implementation, validation, adapter selection, repository state, authorization, and transport remain with their named owners.

#### Scenario: Owner implementation is replaced
- **WHEN** an internal owner uses a different private implementation with the same interface
- **THEN** Workflow Host identity and callers remain unchanged

### Requirement: Workflow-visible native escape hatches SHALL be absent
Workflow runtime and hook scope SHALL not expose `runtime.zotero`, `runtime.handlers`, host-capable `runtime.helpers`, hook-visible `IOUtils`, direct `navigator.clipboard`, raw Zotero objects, Components, Node filesystem modules, internal Broker imports, or runtime adapters.

#### Scenario: Official workflow is statically scanned
- **WHEN** the consumer governance check scans built-in package source
- **THEN** the unauthorized host-access count is zero

### Requirement: Public identity SHALL have one code-native manifest
One readonly code-native manifest SHALL be the runtime identity used for version, recursive conformance, package guard verification, and diagnostics. Types and implementation SHALL mutually check that manifest. Documentation and OpenSpec SHALL describe it but MUST NOT become runtime discovery sources.

#### Scenario: Second allowlist is added
- **WHEN** a separate top-level or nested member allowlist disagrees with the canonical manifest
- **THEN** governance fails and the duplicate cannot become production identity

### Requirement: Host Bridge and MCP SHALL remain independent projections
V12 activation SHALL not automatically expose new Workflow Host members through Host Bridge or MCP. Only the separately approved full-library snapshot projection may change those surfaces as part of its own governed change.

#### Scenario: Workflow-only member is activated
- **WHEN** v12 adds a trusted in-process member not approved for remote exposure
- **THEN** Host Bridge/MCP contracts and permission policy remain unchanged

### Requirement: Workflow hook runs SHALL wire execution control into scoped host APIs
Each workflow hook run SHALL create one runtime-owned abort signal, link (never replace) any upstream caller signal, and compose a scoped Workflow Host whose members fall back to that signal as their default `WorkflowCallControl` when the caller omits control. An explicit caller control, including an empty object, SHALL be respected over the default. The scoped host SHALL bind workflow input materialization to the current workflow/run identity. File, archive, and metadata members SHALL check the effective control signal and MUST NOT publish late success results after cancellation.

#### Scenario: Caller omits control
- **WHEN** a workflow invokes a file, archive, or metadata member without a control argument
- **THEN** the member executes under the hook run's execution signal and cancellation of the run cancels the call

#### Scenario: Caller passes explicit control
- **WHEN** a workflow invokes the same member with its own control object
- **THEN** the explicit control governs the call and the run default is not substituted

### Requirement: File, archive, and input materialization members SHALL use the aligned v12 contract
File picker members SHALL accept the bounded `initialDirectory`/`filters` request DTO; `file.makeDirectory` SHALL support explicit recursive creation. Archive members SHALL accept `{ entries }` request shapes whose entry content is a closed discriminated union, report per-entry `sizeBytes`, detect duplicate entry paths under a single case-folded comparison, and verify written output against the measured plan before returning success. `archive.withExtractedZip` SHALL use the (input, control, callback) signature, scope extracted access to the callback lifetime, and fail closed on cancellation. File and archive failures SHALL use the stable Workflow Host error taxonomy rather than raw runtime exceptions.

#### Scenario: Duplicate archive entries differ only by case
- **WHEN** a write request contains two entry paths that fold to the same comparison key
- **THEN** the request fails with a stable duplicate-value error before any archive is written

#### Scenario: Written archive disagrees with the measured plan
- **WHEN** post-write verification finds the produced files differ from the measured entries or byte counts
- **THEN** the write fails instead of returning a success measurement

#### Scenario: Extraction callback returns after cancellation
- **WHEN** the control signal aborts while an extraction callback is running
- **THEN** `withExtractedZip` fails with a stable canceled error and does not publish the callback result

### Requirement: Synthesis facade failures SHALL use the Workflow Host error contract
Every Synthesis member of the Workflow Host surface SHALL normalize failures through the shared Workflow Host error contract before they reach workflow callers. Synthesis sidecar conflict tokens SHALL map to stable conflict reasons (for example `tag_audit_operation_in_progress` maps to `operation_in_progress`), unavailable or timeout conditions SHALL map to the stable unavailable outcome, and unrecognized failures SHALL map to a stable execution failure. Sidecar-internal codes, reasons, and storage details MUST NOT appear in error details exposed to workflows.

#### Scenario: Sidecar reports a tag-audit conflict
- **WHEN** the sidecar rejects a call with a known tag-audit conflict token
- **THEN** the workflow receives a stable `conflict` error whose reason is the mapped taxonomy value, with no sidecar reason or code in details

#### Scenario: Sidecar fails with an unrecognized error
- **WHEN** the sidecar failure matches no known mapping
- **THEN** the workflow receives a stable `execution_failed` error with adapter-phase recovery semantics

### Requirement: V12 owner DTOs SHALL match the frozen architecture shapes
Owner-level request and result DTOs SHALL carry the fields frozen by the architecture record: related-item mutation results SHALL report a closed outcome enum and the post-write source revision, and SHALL reject self-relation, cross-library, and inactive endpoints at validation; stable issue DTOs SHALL be a closed five-variant union that distinguishes attachment file missing, unreadable, and permission-denied conditions; collection mutations SHALL validate placement against cycles and cross-library parents, normalize membership deltas through one shared validation path, bound removal preview pagination, and read collection versions fail-closed; library snapshot items SHALL carry structured creators and identifier fields; `editor.openSession` SHALL honor an explicit detached request by bypassing the caller session queue instead of silently dropping the flag.

#### Scenario: Related-item mutation reports verified outcome
- **WHEN** `item.addRelated` or `item.removeRelated` completes
- **THEN** the result carries the added/removed/already-present/already-absent outcome and the confirmed source revision from the post-write read

#### Scenario: Detached editor session is requested
- **WHEN** a caller opens an editor session with `detached: true`
- **THEN** the session opens without entering the caller-scoped queue and the flag is not silently ignored

#### Scenario: Collection placement would create a cycle
- **WHEN** a collection create or update places the collection under itself or its descendant
- **THEN** validation fails before any write with a stable invalid-request error