## MODIFIED Requirements

### Requirement: Workspace publication uses one strict v1 registry

ACP Chat and ACP Skills SHALL use the v1 region, action, and presentation
registries as the sole source of publication kind, payload, browser key,
managed region, and source support. Non-v1 publications, generic banner arrays,
producer labels, raw permission details, aliases, and dual writes SHALL be
rejected.

#### Scenario: A removed publication reaches the child

- **WHEN** a publication uses a non-v1 schema or a field absent from v1
- **THEN** the receiver rejects it as invalid
- **AND** canonical state and DOM remain unchanged.

### Requirement: ACP child state is source-neutral

ACP Chat and ACP Skills SHALL use one canonical child state containing
`source`, `navigation`, `services`, and `selection`. Selection SHALL contain
only `owner`, `phase`, `control`, `messageCounts`, `transcript`, `plan`,
`permission`, `composer`, `presentation`, and `details`. Shared
receiver/controller code SHALL NOT write source-specific panel snapshot fields.

#### Scenario: Equivalent publications reach both children

- **WHEN** equivalent normalized publications are delivered to Chat and Skills
- **THEN** they update the same canonical region field
- **AND** only labels, capabilities, owner payloads, and item content may differ.

## ADDED Requirements

### Requirement: Owner details are lazy and owner guarded

The v1 registry SHALL define an `owner-details` publication and exact request
action for both ACP sources. Details SHALL use bounded read-only sections and
actions, SHALL NOT contain transcript pages, event histories, or complete
session/run snapshots, and SHALL be committed only when their owner equals the
current canonical owner.

#### Scenario: A late details response follows an owner switch

- **WHEN** owner A requests details and the user selects owner B before the read completes
- **THEN** owner B is rendered loading-first and owner A details are discarded
- **AND** the details drawer does not display stale owner A content.

### Requirement: Permission publication is structured

The v1 permission DTO SHALL use `approvalKind` equal to `acp-tool` or
`zotero-write`, bounded tool metadata, structured command/preview review, and
backend-provided options. Permission actions SHALL carry only request ID,
outcome, and optional option ID while owner identity remains solely in the
action envelope.

#### Scenario: A permission action is routed

- **WHEN** the user selects an approval option or Cancel
- **THEN** the Host receives the canonical owner envelope and exact permission action fields
- **AND** legacy source strings, raw JSON, and duplicate owner fields are rejected.

### Requirement: Owner control separates semantic hint from composer state

The v1 owner-control DTO SHALL carry a semantic hint kind and optional bounded
message derived from the Chat session or Skills run SSOT. Composer reply state
SHALL contain interaction availability only and SHALL NOT duplicate the owner
hint. The owner-control and permission registry entries SHALL manage the hint
region, and the composer registry entry SHALL manage only composer content.

#### Scenario: An idle Chat conversation retains a stop reason

- **WHEN** a selected Chat conversation is idle with a recorded stop reason
- **THEN** owner control publishes the stop notice for the hint region
- **AND** the composer footer remains empty.
