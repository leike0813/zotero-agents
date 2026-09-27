## MODIFIED Requirements

### Requirement: Workflow Host SHALL expose one exact v12 surface
The active Workflow Host interface SHALL contain metadata values `version: 12` and `interactionMode: "interactive" | "non_interactive"`, plus exactly the twenty-one nested modules and callable members below. No listed module or member is optional.

```text
addon: getConfig
environment: getInfo
context: getCurrentView, getSelectedItems
navigation: openItem, openNote, openCollection, openSelection
library: listItems, traverseItems, withItemSnapshot, listCollections, listSavedSearches,
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

The manifest SHALL measure 23 top-level keys, including two metadata values and twenty-one nested modules, and 88 callable members. Synthesis grouping keys SHALL not count as callable members.

#### Scenario: Interactive projection is inspected
- **WHEN** recursive conformance inspects every top-level and nested key
- **THEN** the projection has exactly the declared 23/21/88 identity and every callable position is a function

#### Scenario: Undeclared member is exposed
- **WHEN** composition, Broker growth, or a spread adds a top-level or nested member
- **THEN** contract conformance fails before the build can publish the projection

## ADDED Requirements

### Requirement: Workflow readers SHALL preserve canonical page and control semantics
Workflow library members SHALL explicitly project Broker source pages and call controls. Complete consumers SHALL follow continuation to exhaustion, including empty nonterminal payload scans. The projection SHALL NOT accept both complete arrays and pages, rebuild legacy rich objects, or reacquire live selection to compensate for changed reader results.

#### Scenario: A workflow needs an attachment on a later page
- **WHEN** a research bundle or workflow reader searches beyond its first page
- **THEN** it follows canonical continuation and preserves the existing complete task result.

#### Scenario: Scoped workflow is canceled
- **WHEN** cancellation occurs between source pages
- **THEN** no subsequent native page starts and no successful complete result is fabricated.
