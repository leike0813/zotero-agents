# zotero-mcp-tool-suite Specification

## Purpose
TBD - created by archiving change add-zotero-mcp-tool-suite. Update Purpose after archive.
## Requirements
### Requirement: Formal broker-backed Zotero MCP tool registry

The system SHALL expose Zotero MCP tools from a registry that defines tool metadata, input schema, and handler behavior.

#### Scenario: Tool listing includes formal tool suite

- **WHEN** an MCP client calls `tools/list`
- **THEN** the server SHALL return the formal Zotero read and mutation tools with JSON schemas
- **AND** tool definitions SHALL be generated from the registry rather than hard-coded per response.

#### Scenario: Unknown tool is rejected

- **WHEN** an MCP client calls an unknown Zotero tool
- **THEN** the server SHALL return a JSON-RPC invalid params error
- **AND** no broker read or write call SHALL be executed.

### Requirement: JSON-safe read MCP tools

The system SHALL expose read-only Zotero MCP tools through `hostApi.context` and `hostApi.library`.

#### Scenario: Current view and selected items

- **WHEN** an MCP client calls `zotero.get_current_view` or `zotero.get_selected_items`
- **THEN** the tool SHALL return JSON-safe broker DTOs
- **AND** raw Zotero objects SHALL NOT be returned.

#### Scenario: Library query tools

- **WHEN** an MCP client calls `zotero.search_items`, `zotero.get_item_detail`, `zotero.get_item_notes`, or `zotero.get_item_attachments`
- **THEN** the tool SHALL call the corresponding `hostApi.library` API
- **AND** the result SHALL include compact text content and structured JSON content.

### Requirement: Attachment access DTO

The system SHALL return attachment access metadata without embedding file contents in MCP JSON.

#### Scenario: Local file attachment

- **WHEN** `zotero.get_item_attachments` returns a file attachment with a local path
- **THEN** the MCP result SHALL include `access.mode = "local-path"` and `access.path`
- **AND** the MCP result SHALL NOT include the file content.

#### Scenario: Remote-compatible attachment contract

- **WHEN** an attachment is returned
- **THEN** the MCP result SHALL include a stable `access` object that can later represent `download-url`
- **AND** clients SHALL NOT need a schema change when remote attachment URLs are added.

### Requirement: Permission-gated mutation MCP tools

The system SHALL expose limited Zotero writes through broker mutation preview and permission-gated execute.

#### Scenario: Preview mutation

- **WHEN** an MCP client calls `zotero.preview_mutation`
- **THEN** the server SHALL call `hostApi.mutations.preview()`
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Approved write tool

- **WHEN** an MCP client calls a supported write tool and the user approves the permission request
- **THEN** the server SHALL call `hostApi.mutations.execute()`
- **AND** return a JSON-safe execution result.

#### Scenario: Denied or unavailable permission

- **WHEN** permission is denied or no permission hook is available
- **THEN** the server SHALL return a structured non-executed result
- **AND** Zotero data SHALL NOT be changed.

### Requirement: Zotero MCP service design document

The project SHALL maintain a service-level design document for the Zotero MCP tool suite.

#### Scenario: Tool contract documentation exists

- **WHEN** the MCP tool suite is reviewed or changed
- **THEN** `doc/components/zotero-mcp-service-design.md` SHALL define the current tool names, purposes, input signatures, structured result contracts, text disclosure rules, and failure guidance
- **AND** `doc/components/zotero-host-capability-broker-ssot.md` SHALL remain the architecture boundary SSOT.

### Requirement: Agent-facing MCP text disclosures are actionable

Zotero MCP tool results SHALL include agent-readable text that enables follow-up
calls without relying on hidden structured fields alone.

#### Scenario: Synthesis tools return DTOs

- **WHEN** a Synthesis MCP tool returns topic, resolver, registry, graph, or
  artifact DTOs
- **THEN** `content[0].text` SHALL include actionable identifiers, counts,
  cursor state, or paper refs relevant to follow-up calls
- **AND** structured content SHALL contain the same DTO payload.

### Requirement: Zotero MCP v1 does not expose attachment text extraction tools

The Zotero MCP v1 service contract SHALL NOT define aggregate item-context or attachment-text extraction tools.

#### Scenario: Agent needs PDF body text

- **WHEN** an ACP agent needs attachment body text
- **THEN** v1 SHALL expose attachment access metadata through `get_item_attachments`
- **AND** it SHALL NOT claim that `get_item_context`, `get_attachment_text_chunk`, or equivalent attachment text tools are available.

### Requirement: Permission-gated write disclosures

Zotero MCP write tools SHALL disclose preview, permission, execution, and verification state to the agent.

#### Scenario: Write mutation is not approved

- **WHEN** a write tool is denied or no permission hook is available
- **THEN** the result SHALL clearly state that no Zotero write was executed
- **AND** structured content SHALL include the preview and permission outcome.

#### Scenario: Write mutation executes

- **WHEN** a write tool executes
- **THEN** the result SHALL include execution outcome and a verification hint
- **AND** agents SHALL be guided to verify state before retrying after ambiguous transport failures.

### Requirement: Zotero MCP note payload tools

The Zotero MCP service SHALL expose workflow-aware note payload read tools without requiring agents to parse Zotero note HTML manually.

#### Scenario: Listing note payloads

- **WHEN** an MCP client calls `list_note_payloads` with a Zotero note ref
- **THEN** the result SHALL list each hidden `data-zs-payload` block
- **AND** it SHALL include `payloadType`, encoding, version when available, estimated decoded size, note kind, and a recommended `get_note_payload` call.

#### Scenario: Reading a markdown payload

- **WHEN** an MCP client calls `get_note_payload` for a markdown payload
- **THEN** the result SHALL expose canonical markdown text with `offset`, `nextOffset`, `totalChars`, and `hasMore`
- **AND** it SHALL decode both plain markdown payloads and JSON wrappers containing `content`.

#### Scenario: Reading a JSON payload

- **WHEN** an MCP client calls `get_note_payload` for a JSON payload
- **THEN** the result SHALL expose the decoded JSON payload in structured content
- **AND** it SHALL expose a bounded JSON text chunk for agent-readable inspection.

### Requirement: Zotero MCP markdown-backed note write tools

The Zotero MCP service SHALL provide permission-gated tools for creating and updating markdown-backed Zotero notes.

#### Scenario: Creating a markdown note

- **WHEN** an MCP client calls `create_markdown_note`
- **THEN** the tool SHALL create note HTML containing a rendered view and a base64 hidden markdown payload
- **AND** the write SHALL execute only after the normal MCP permission flow approves it.

#### Scenario: Updating a markdown note

- **WHEN** an MCP client calls `update_markdown_note`
- **THEN** the tool SHALL verify that the target note already has a markdown payload
- **AND** it SHALL reject the update when `expectedPayloadType` is provided and does not match the existing payload.

#### Scenario: JSON workflow payload writes remain out of scope

- **WHEN** an MCP client attempts to use markdown note tools for `references-json` or `citation-analysis-json`
- **THEN** the service SHALL reject the request
- **AND** it SHALL direct agents to dedicated workflow/editor capabilities for structured JSON workflow edits.

### Requirement: Raw note tools remain compatible

Existing raw note MCP tools SHALL keep their current contracts.

#### Scenario: Raw HTML note tools are listed

- **WHEN** an MCP client lists tools
- **THEN** `create_child_note`, `update_note`, and `get_note_detail` SHALL remain available with their existing raw HTML/text semantics
- **AND** the new payload-aware tools SHALL be separate tool names.

### Requirement: Zotero MCP paper reading context tool

The Zotero MCP service SHALL provide a bounded aggregation tool for paper reading setup.

#### Scenario: Preparing context from an explicit item

- **WHEN** an MCP client calls `prepare_paper_reading_context` with an item ref
- **THEN** the result SHALL include item metadata, bounded note summaries, note payload manifests, attachment manifests, a recommended reading attachment when available, next-call guidance, and limitations
- **AND** it SHALL NOT include attachment file content.

#### Scenario: Preparing context from current selection

- **WHEN** an MCP client calls `prepare_paper_reading_context` without an item ref
- **THEN** the service SHALL resolve the current item first, then a single selected item
- **AND** it SHALL reject multiple selected items with candidate refs instead of guessing.

### Requirement: Zotero MCP attachment reading metadata

The Zotero MCP service SHALL classify attachments for reading recommendation without reading file contents.

#### Scenario: Attachment manifests include reading metadata

- **WHEN** `get_item_attachments` or `prepare_paper_reading_context` returns attachments
- **THEN** each attachment SHALL include `contentRole`, `readability`, `rank`, `recommendedForReading`, and `recommendationReason`
- **AND** Markdown and TXT local attachments SHALL rank ahead of PDFs for reading.

#### Scenario: Attachment content remains out of scope

- **WHEN** an MCP client receives attachment manifests
- **THEN** the result SHALL disclose local path/access metadata only
- **AND** it SHALL explicitly state that attachment file content was not returned.

### Requirement: MCP callable smoke failures are diagnosable across backends

ACP SkillRunner-compatible runs with required MCP tools SHALL persist a
backend-agnostic diagnostic bundle when callable smoke fails.

#### Scenario: Smoke failure records context injection diagnostics

- **GIVEN** a workflow declares required Zotero MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** callable smoke fails
- **THEN** the run SHALL record a diagnostic classification
- **AND** the run SHALL persist a redacted diagnostic JSON file
- **AND** the run SHALL persist a backend evidence log.

#### Scenario: Backend-specific evidence remains optional

- **GIVEN** a backend does not provide Claude Code debug files
- **WHEN** callable smoke fails
- **THEN** the diagnostic bundle SHALL still be generated from backend-neutral
  host evidence.

### Requirement: MCP context diagnostics do not leak credentials

MCP context diagnostics SHALL redact bearer tokens and authorization headers.

#### Scenario: Descriptor contains authorization

- **WHEN** the host persists MCP context diagnostics
- **THEN** the diagnostic JSON and evidence log SHALL NOT contain the raw bearer
  token or full Authorization header value.

### Requirement: ACP callable smoke has a hard timeout

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
bound callable smoke with a hard timeout before sending any business skill
prompt.

#### Scenario: Smoke times out

- **GIVEN** a workflow declares required MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** ACP callable smoke does not complete before the timeout
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL fail with a clear MCP callable smoke timeout error.

### Requirement: Smoke prompt forbids alternate tool-access attempts

The callable smoke prompt SHALL instruct the agent to use only the declared MCP
callables for the smoke and SHALL forbid shell/config/file searches or alternate
bridges during smoke.

#### Scenario: Smoke prompt is bounded to callable exposure

- **WHEN** the ACP runner sends a callable smoke prompt
- **THEN** the prompt SHALL state that the agent must not search MCP config,
  read project files, use shell commands, guess tool names, initialize runtime
  DB, or execute skill steps.

### Requirement: ACP runtime prompts are packaged separately from skill patch templates

ACP MCP smoke and required-MCP guard prompt bodies SHALL be loaded from ACP
runtime prompt template assets, not hardcoded in orchestration business logic and
not mixed with ACP skill patch templates.

#### Scenario: Runtime smoke prompt is rendered from runtime templates

- **GIVEN** the ACP runner needs to send a callable smoke prompt
- **WHEN** it builds the smoke message
- **THEN** it SHALL load the `mcp_callable_smoke` ACP runtime prompt template
- **AND** render declared required tools and timeout values into that template
- **AND** the template SHALL reside outside `addon/content/acp-skill-patches/templates`.

#### Scenario: Required MCP guard is rendered from runtime templates

- **GIVEN** a workflow declares required MCP tools
- **WHEN** the ACP runner sends the business skill prompt after smoke
- **THEN** it SHALL prepend the `mcp_required_guard` ACP runtime prompt template
- **AND** the template SHALL reside outside `addon/content/acp-skill-patches/templates`.

#### Scenario: Recovered continuation guard is rendered from runtime templates

- **GIVEN** the ACP runner recovers a previous ACP Skill run session
- **WHEN** it sends a continuation prompt
- **THEN** it SHALL render the `recovered_continuation_guard` ACP runtime prompt template
- **AND** the template SHALL reside outside `addon/content/acp-skill-patches/templates`.

### Requirement: ACP runtime prompt templates use English wording

ACP runtime orchestration prompt templates SHALL use English wording to stay
consistent with the rest of the ACP execution prompt surface.

#### Scenario: Runtime prompt family stays language-consistent

- **WHEN** ACP runtime prompt templates are packaged
- **THEN** the MCP smoke, required-MCP guard, and recovered continuation guard
  templates SHALL be written in English.

### Requirement: ACP required MCP tools are callable-smoked

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
verify that the current ACP session exposes the required Zotero MCP callables
before sending the business skill prompt.

#### Scenario: Callable smoke succeeds

- **GIVEN** required MCP tools are declared
- **AND** host MCP availability preflight succeeds
- **WHEN** the ACP session is created or recovered
- **THEN** the runner SHALL send a smoke prompt before the business prompt
- **AND** the run SHALL continue only after each required tool reaches Zotero MCP
  as a `tools/call`.

#### Scenario: Callable smoke fails

- **GIVEN** required MCP tools are declared
- **AND** the ACP session does not expose one required callable
- **WHEN** smoke runs
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL record a clear MCP callable smoke failure.

### Requirement: Required-MCP runs receive an MCP guard

ACP business prompts for required-MCP workflows SHALL include a short guard
stating that host MCP checks already ran and that agents must not search MCP
configuration or diagnose tool injection manually.

#### Scenario: Guard is injected

- **GIVEN** a required-MCP workflow
- **WHEN** the business prompt or recovered continuation prompt is sent
- **THEN** it SHALL include the MCP guard before user/skill task content.

### Requirement: ACP required MCP tools are preflighted before prompting

The ACP SkillRunner-compatible runner SHALL preflight runner-declared MCP tools
before sending the first prompt to an ACP agent.

#### Scenario: HTTP MCP is unavailable

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the ACP backend does not advertise HTTP MCP support
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before `newSession` or `prompt`
- **AND** the failure SHALL list the required MCP tools.

#### Scenario: Required tool is missing

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the embedded Zotero MCP tool registry does not contain one required
  tool
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before the first prompt
- **AND** the error SHALL name the missing tool.

### Requirement: High-risk artifact read tool is not public

The Zotero MCP tool registry SHALL NOT expose
`synthesis.read_paper_artifacts` as a public tool.

#### Scenario: Tool listing excludes read_paper_artifacts

- **WHEN** an MCP client calls `tools/list`
- **THEN** the returned tool names SHALL NOT include
  `synthesis.read_paper_artifacts`.

#### Scenario: Direct call is rejected

- **WHEN** an MCP client calls `tools/call` with
  `synthesis.read_paper_artifacts`
- **THEN** the response SHALL be an unknown-tool JSON-RPC error.

### Requirement: Synthesis tool suite supports review-ready topic artifacts

The Zotero MCP tool suite SHALL expose topic synthesis artifacts that contain
review-ready evidence structures without adding new write tools.

#### Scenario: Topic detail is read after synthesis

- **WHEN** a topic synthesis artifact contains review-oriented sections
- **THEN** read-only synthesis tools SHALL return those sections as structured
  JSON-safe values
- **AND** no tool SHALL expose raw full paper artifact payloads for this
  purpose.

### Requirement: Zotero MCP tool listing exposes current synthesis tools

The Zotero MCP server SHALL list only the current public synthesis tools.

#### Scenario: Filtered artifact export replaces bundle export

- **WHEN** an MCP client calls `tools/list`
- **THEN** the returned tool names SHALL include
  `synthesis.export_filtered_paper_artifacts`
- **AND** SHALL NOT include `synthesis.export_paper_artifact_bundle`.

#### Scenario: Unknown old export tool is rejected

- **WHEN** an MCP client calls `synthesis.export_paper_artifact_bundle`
- **THEN** the MCP protocol SHALL return a tool-not-found error.

### Requirement: Tool contracts include enforceable validation metadata

Public Zotero MCP tool definitions SHALL include schema constraints that the
server enforces before executing handlers.

#### Scenario: Tool list exposes bounded schemas

- **WHEN** an MCP client calls `tools/list`
- **THEN** tool schemas SHALL include `additionalProperties=false`
- **AND** bounded fields SHALL declare applicable enum, length, item, or numeric
  constraints.

### Requirement: Tool results expose stable error metadata

Known tool execution failures SHALL expose stable error fields for agent retry
and correction decisions.

#### Scenario: Tool returns recoverable failure

- **WHEN** a tool returns `isError=true`
- **THEN** structured content SHALL include the tool name, stable error code,
  retryable flag, and optional retry-after milliseconds.

