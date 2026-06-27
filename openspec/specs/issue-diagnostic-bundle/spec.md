# issue-diagnostic-bundle Specification

## Purpose

Defines the one-click issue diagnostic bundle (RuntimeIssueDiagnosticBundleV1) that users copy/attach to issues — a high-signal, redacted, evidence-gap-aware subset of raw runtime diagnostics.

## Requirements

### Requirement: Issue Diagnostic Bundle SHALL Be One-Click Issue JSON

The system SHALL provide a single JSON issue diagnostic bundle that users can copy or attach to an issue without collecting separate workspace files.

#### Scenario: Build issue diagnostic bundle

- **WHEN** the user copies a diagnostic bundle from the log viewer
- **THEN** the output SHALL use schema version `runtime-issue-diagnostic-bundle/v1`
- **AND** it SHALL include environment, context, backend health, incidents, timeline, evidence gaps, and redaction metadata.

### Requirement: Issue Diagnostic Bundle SHALL Exclude Raw Logs By Default

The issue diagnostic bundle SHALL prioritize high-signal summaries and SHALL NOT include full retained raw log entries by default.

#### Scenario: Default issue export

- **WHEN** an issue diagnostic bundle is built with default options
- **THEN** the output SHALL NOT include the raw `entries` array from retained runtime logs
- **AND** the timeline SHALL include only high-signal events such as warnings, errors, terminal states, backend probes, and cache refreshes.

### Requirement: Issue Diagnostic Bundle SHALL Report Evidence Gaps

The issue diagnostic bundle SHALL explicitly report missing evidence that may limit issue triage.

#### Scenario: Missing backend probe evidence

- **WHEN** the selected context refers to an ACP backend and retained logs contain no ACP probe or runtime option cache refresh event
- **THEN** the bundle SHALL include an evidence gap describing the missing ACP backend probe evidence.

### Requirement: Issue Diagnostic Bundle SHALL Preserve Redaction Guarantees

The issue diagnostic bundle SHALL use the runtime log sanitizer and SHALL describe its redaction and truncation policy.

#### Scenario: Secret-bearing data is present

- **WHEN** retained logs or backend refresh details contain Authorization headers, cookies, tokens, api keys, or passwords
- **THEN** the issue bundle SHALL replace those values with the redacted placeholder or sanitized summaries.
