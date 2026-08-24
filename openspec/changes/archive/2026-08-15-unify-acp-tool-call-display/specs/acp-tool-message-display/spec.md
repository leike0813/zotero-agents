## MODIFIED Requirements

### Requirement: Tool Display Fields

ACP Chat and ACP Skills snapshots SHALL derive optional tool display fields through one ACP tool display projection without breaking older snapshots.

#### Scenario: Tool item carries normalized display data

- **WHEN** a tool call report contains display data
- **THEN** the resulting `tool_call` item MAY include `toolName`, `title`, `toolKind`, `inputSummary`, `resultSummary`, and compatibility-only `summary`
- **AND** the same report sequence produces the same display fields in ACP Chat and ACP Skills

#### Scenario: Partial update preserves prior display data

- **WHEN** a later tool call update omits a display field or supplies null, an empty string, or an empty structure
- **THEN** the prior valid display value remains unchanged
- **AND** lifecycle state, item identity, timestamps, persistence, and publication remain owned by the containing transcript path

#### Scenario: Existing snapshots remain readable

- **WHEN** a transcript contains a tool item persisted before the unified projection
- **THEN** the item remains renderable through compatibility fallbacks
- **AND** the stored transcript is not rewritten or backfilled

### Requirement: Tool Input Summary Freezing

The ACP tool display projection SHALL freeze the first valid input summary for a tool call.

#### Scenario: Pending empty input does not freeze

- **WHEN** an initial tool call report contains no valid input summary and a later update contains input arguments
- **THEN** the later input arguments become `inputSummary`

#### Scenario: Later input does not replace the first valid input

- **WHEN** a tool call already has a valid `inputSummary` and a later update contains different input arguments or a result
- **THEN** the original `inputSummary` remains unchanged

#### Scenario: Result does not overwrite input summary

- **WHEN** a completed result update arrives for a tool call with a valid `inputSummary`
- **THEN** the `inputSummary` remains unchanged
- **AND** valid result content MAY replace `resultSummary`

#### Scenario: Structured input preserves information

- **WHEN** the first valid input is a non-empty object or array
- **THEN** `inputSummary` contains its complete compact single-line JSON representation rather than one preferred nested field

### Requirement: Generic Tool Text Filtering

ACP tool display projection and rendering SHALL filter placeholders according to field meaning without interpreting canonical programmatic names.

#### Scenario: Canonical name remains opaque

- **WHEN** an update supplies any non-empty string in canonical `name`
- **THEN** that value is accepted as `toolName` after trimming and safety bounding
- **AND** its spelling is not classified with generated-ID or placeholder regular expressions

#### Scenario: Compatibility identity placeholder is ignored

- **WHEN** a compatibility identity field equals `tool`, `tool call`, `other`, or the current `toolCallId`
- **THEN** it is not used as `toolName`

#### Scenario: Generated call title is ignored relationally

- **WHEN** a title equals the current `toolCallId`, `Call <toolCallId>`, or `Tool <toolCallId>`
- **THEN** it is not used as a display title
- **AND** unrelated names such as `callback` remain valid

#### Scenario: Payload-shaped strings remain payloads

- **WHEN** a real input or result string equals `[]` or `{}`
- **THEN** the string is retained
- **AND** only typed empty arrays and objects are treated as missing payloads

#### Scenario: Generic summary is ignored

- **WHEN** a compatibility `summary` equals `[]`
- **THEN** it does not generate `inputSummary`
- **AND** it is not selected as compact tool-row text

#### Scenario: Generated call id is ignored

- **WHEN** a compatibility identity or generated title exposes the current `toolCallId`
- **THEN** it is not selected as the tool name or title
- **AND** a canonical `name` with the same spelling remains opaque

### Requirement: Tool Row Display

ACP tool rows, transcript previews, and durable transcript indexes SHALL use one compact display selection while preserving full bounded display state for tooltips and details.

#### Scenario: Tool row selects primary and secondary text

- **WHEN** a normalized tool item renders
- **THEN** primary text is selected from `toolName`, then `title`, then a non-`other` `toolKind`
- **AND** secondary text is selected from `inputSummary`, an unused `title`, compatibility `summary`, then `resultSummary`
- **AND** duplicate normalized text is skipped

#### Scenario: Tool row uses name and input summary

- **WHEN** a normalized tool item has `toolName` and `inputSummary`
- **THEN** the row displays a state LED and the tool name as its badge
- **AND** it displays the input summary as the compact call detail

#### Scenario: Final fallback is localized by the UI

- **WHEN** the compact selector finds no primary text
- **THEN** it returns no primary value
- **AND** the final renderer supplies the localized generic tool label

#### Scenario: Tool row omits state text

- **WHEN** the normalized tool item is completed
- **THEN** row state is represented by LED styling
- **AND** the row does not display `completed` as user-facing text

### Requirement: Compatibility Samples

ACP tool display projection SHALL remain compatible with the saved Claude Code, OpenCode, Codex, Gemini, and Qwen Code samples in `artifact/acp-transcript-samples/2026-04-27/` through a closed field allowlist.

#### Scenario: Canonical fields precede compatibility aliases

- **WHEN** a report contains canonical ACP display fields and compatibility aliases
- **THEN** canonical `name`, `title`, `kind`, `rawInput`, text `content`, and `rawOutput` take precedence for their respective display roles

#### Scenario: Supported compatibility aliases are accepted

- **WHEN** canonical fields are absent
- **THEN** identity MAY fall back to `tool`, `functionName`, or `function_name`
- **AND** title MAY fall back to `metadata.title`
- **AND** kind MAY fall back to `toolKind`
- **AND** input MAY fall back to `input`, `arguments`, `args`, `parameters`, or `params`
- **AND** result MAY fall back to `output`, `result`, `message`, or `detail`

#### Scenario: Common adapter field variants are supported

- **WHEN** tool updates use the canonical fields or supported aliases named above
- **THEN** the projection derives each display role from the strongest valid field
- **AND** Chat and Skills apply the same precedence

#### Scenario: Compatibility summary remains isolated

- **WHEN** a report supplies non-standard `summary`
- **THEN** it is retained only as compatibility `summary`
- **AND** it does not generate `toolName`, `inputSummary`, or `resultSummary`

## ADDED Requirements

### Requirement: Tool Result Summary Updates

The ACP tool display projection SHALL present the latest valid result without treating missing data as a clear operation.

#### Scenario: ACP text content is human-readable

- **WHEN** an update contains standard wrapped text content blocks or compatible direct text blocks
- **THEN** all non-empty text blocks are joined in order into a single-line `resultSummary`
- **AND** diff, terminal, image, audio, resource, and malformed blocks are skipped

#### Scenario: Later valid result replaces prior result

- **WHEN** a tool call with an existing result receives a later valid result
- **THEN** the later result replaces `resultSummary` rather than appending to it

#### Scenario: Missing result preserves prior result

- **WHEN** a later update contains no valid result
- **THEN** the existing `resultSummary` remains unchanged

### Requirement: Tool Display Value Bounds

ACP tool display values SHALL be normalized and bounded independently of visual CSS truncation.

#### Scenario: Display values use role-specific safety bounds

- **WHEN** a normalized display value exceeds its limit
- **THEN** it is truncated by Unicode code point with an ellipsis included in the limit
- **AND** limits are 256 for `toolName`, 512 for `title`, and 1024 for each input or result summary

#### Scenario: Unsupported values fail closed

- **WHEN** a compatibility value cannot be serialized safely
- **THEN** that candidate is skipped without throwing
- **AND** object stringification, function source, or raw invalid values are not emitted as fallback text
