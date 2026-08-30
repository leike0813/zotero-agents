## ADDED Requirements

### Requirement: Current Workflow documentation SHALL describe only v12 host behavior
Current Workflow Host, hook helper, Broker ownership, package compatibility, and execution documentation SHALL describe the exact v12 interface and hard cut. Historical v11 behavior MAY remain only in archived changes and MUST NOT appear as current guidance.

#### Scenario: Current documentation is scanned
- **WHEN** documentation governance scans explicit Workflow Host version declarations
- **THEN** every active declaration identifies v12 and no current page recommends a removed member or fallback

### Requirement: Documentation SHALL preserve owner and projection distinctions
Documentation SHALL state that Broker owns Zotero semantics, Workflow Host owns trusted in-process composition, runtime persistence owns ordinary filesystem selection, runtime bridge and picker own their separate seams, platform subprocess owns one-shot execution, Synthesis sidecar owns durable application state, and Host Bridge/MCP own remote policy.

#### Scenario: Developer looks up attachment locality
- **WHEN** the docs describe attachment results
- **THEN** they distinguish trusted Workflow local paths from Host Bridge/MCP remote locality projection

### Requirement: Generated help SHALL remain source-derived
Embedded help documentation SHALL be regenerated only through its owner pipeline after current source documentation is updated. Generated help targets MUST NOT be edited directly during v12 activation.

#### Scenario: Help content needs v12 wording
- **WHEN** a source document changes
- **THEN** the documentation pipeline produces the generated target and drift checks verify it
