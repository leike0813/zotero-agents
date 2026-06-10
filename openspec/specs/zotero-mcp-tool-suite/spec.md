# zotero-mcp-tool-suite Specification

## Purpose
TBD - created by archiving change add-zotero-mcp-tool-suite. Update Purpose after archive.
## Requirements
### Requirement: Formal broker-backed Zotero MCP tool registry

The system SHALL expose Zotero MCP tools by mirroring the Host Bridge
capability registry.

#### Scenario: Tool listing includes formal tool suite

- **WHEN** an MCP client calls `tools/list`
- **THEN** the server SHALL return Host Bridge capability names with JSON schemas
- **AND** tool definitions SHALL be generated from the Host Bridge capability
  registry rather than hard-coded per response.

#### Scenario: Unknown tool is rejected

- **WHEN** an MCP client calls an unknown Zotero tool
- **THEN** the server SHALL return a JSON-RPC invalid params error
- **AND** no broker read or write call SHALL be executed.

### Requirement: JSON-safe read MCP capabilities

The system SHALL expose read-only Host Bridge context and library capabilities
as MCP tools.

#### Scenario: Current view and selected items

- **WHEN** an MCP client calls `context.get_current_view` or
  `context.get_selected_items`
- **THEN** the tool SHALL return JSON-safe broker DTOs
- **AND** raw Zotero objects SHALL NOT be returned.

#### Scenario: Library query tools

- **WHEN** an MCP client calls `library.search_items`,
  `library.get_item_detail`, `library.get_item_notes`, or
  `library.get_item_attachments`
- **THEN** the tool SHALL call the corresponding `hostApi.library` API
- **AND** the result SHALL include compact text content and structured JSON content.

### Requirement: Attachment access DTO

The system SHALL return attachment access metadata without embedding file contents in MCP JSON.

#### Scenario: Local file attachment

- **WHEN** `library.get_item_attachments` returns a file attachment with a local path
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
The Zotero MCP service SHALL expose workflow-aware note payloads from v2 embedded payload storage and legacy payload formats.

#### Scenario: Listing note payloads includes v2 metadata
- **WHEN** an agent lists note payloads for a v2-backed note
- **THEN** the result SHALL include the payload type, embedded attachment key, storage version, source, and anchor status.

### Requirement: Zotero MCP markdown-backed note write tools

The Zotero MCP service SHALL provide permission-gated tools for creating and updating markdown-backed Zotero notes.

#### Scenario: Creating a markdown note

- **WHEN** an MCP client calls `create_markdown_note`
- **THEN** the tool SHALL create note HTML containing a rendered view and a readable markdown payload
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

### Requirement: MCP context diagnostics do not leak credentials

MCP context diagnostics SHALL redact bearer tokens and authorization headers.

#### Scenario: Descriptor contains authorization

- **WHEN** the host persists MCP context diagnostics
- **THEN** the diagnostic JSON and evidence log SHALL NOT contain the raw bearer
  token or full Authorization header value.

### Requirement: ACP runtime prompts are packaged separately from skill patch templates

ACP required-MCP guard prompt bodies SHALL be loaded from ACP runtime prompt
template assets, not hardcoded in orchestration business logic and not mixed
with ACP skill patch templates.

#### Scenario: Required MCP guard is rendered from runtime templates

- **GIVEN** a workflow declares required MCP tools
- **WHEN** the ACP runner sends the business skill prompt after preflight
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
- **THEN** the required-MCP guard and recovered continuation guard templates SHALL be written in English.

### Requirement: Required-MCP runs receive an MCP guard

ACP business prompts for required-MCP workflows SHALL include a short guard
stating that host MCP preflight checks already ran and that agents must not
search MCP configuration or diagnose tool injection manually.

#### Scenario: Guard is injected

- **GIVEN** a required-MCP workflow
- **WHEN** the business prompt or recovered continuation prompt is sent
- **THEN** it SHALL include the MCP guard before user/skill task content.

### Requirement: ACP required MCP tools are preflighted before prompting

The ACP SkillRunner-compatible runner SHALL preflight runner-declared MCP tools
before sending the first prompt to an ACP agent. This preflight SHALL be the
only blocking host-side MCP readiness gate; the runner SHALL NOT send a separate
callable-smoke prompt.

#### Scenario: HTTP MCP is unavailable

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the ACP backend does not advertise HTTP MCP support
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before `newSession` or `prompt`
- **AND** the failure SHALL list the required MCP tools.

#### Scenario: Required tool is missing

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the embedded Zotero MCP tool registry does not contain one required tool
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before the first prompt
- **AND** the error SHALL name the missing tool.

#### Scenario: Required tools pass preflight

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the ACP backend advertises HTTP MCP support
- **AND** the embedded Zotero MCP registry contains every required tool
- **WHEN** the ACP session is created or recovered
- **THEN** the runner SHALL send the guarded business prompt directly
- **AND** it SHALL NOT send a separate callable-smoke prompt.

### Requirement: Paper artifact read capability is public and bounded

The Zotero MCP tool registry SHALL expose `paper_artifacts.read`
when the Host Bridge capability registry exposes it.

#### Scenario: Tool listing includes read_paper_artifacts

- **WHEN** an MCP client calls `tools/list`
- **THEN** the returned tool names SHALL include
  `paper_artifacts.read`.

#### Scenario: Direct call dispatches through Host Bridge

- **WHEN** an MCP client calls `tools/call` with
  `paper_artifacts.read`
- **THEN** the response SHALL be produced by the Host Bridge capability handler
- **AND** the response SHALL retain bounded artifact output semantics.

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
  `paper_artifacts.export_filtered`
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

### Requirement: MCP-facing Host Bridge docs do not leak master tokens
MCP/agent-facing documentation MAY describe remote Host Bridge profiles, but MUST NOT expose plaintext master tokens in status or manifest examples.

#### Scenario: Manifest shown to agent
- **WHEN** Host Bridge manifest is inspected
- **THEN** master token state is masked
- **AND** plaintext master token is only available through the explicit preferences copy action

### Requirement: Zotero MCP server SHALL preserve JSON-RPC request text
The embedded Zotero MCP server SHALL parse JSON-RPC HTTP request bodies from raw bytes and decode them as UTF-8.

#### Scenario: Non-ASCII JSON-RPC arguments survive request parsing
- **WHEN** an MCP client posts JSON-RPC arguments containing non-ASCII text
- **THEN** the tool handler SHALL receive those characters exactly.

#### Scenario: Malformed UTF-8 JSON-RPC body is rejected
- **WHEN** an MCP request body is not valid UTF-8
- **THEN** the server SHALL return a stable parse/bad-request response
- **AND** it SHALL NOT pass mojibake text to the JSON-RPC dispatcher.
