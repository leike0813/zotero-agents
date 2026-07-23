## ADDED Requirements

### Requirement: Hermes SHALL be a hosted facet over Generic
The Hermes profile SHALL include the Generic and Minimum components byte-identically and SHALL add only resident operating policy, persona, configuration, cron entries, installation support, and resident-service assets.

#### Scenario: Hosted task uses Generic policy
- **WHEN** Hermes answers a library question or performs a bounded research task
- **THEN** it invokes the corresponding Generic task Skill and adds only resident freshness or automation behavior

### Requirement: Librarian SHALL expose one resident service
The profile SHALL expose `scripts/zotero_librarian_service.py` as the single formal entrypoint for index, workflow catalog, watched run, notification, maintenance, synthesis attention, and scheduled operations.

#### Scenario: Cron invokes one-pass operations
- **WHEN** a scheduled job fires
- **THEN** it invokes one resident-service subcommand, receives a terminal receipt, and exits without long polling

### Requirement: Resident state SHALL have one schema owner
The resident service SHALL exclusively initialize and update `state.sqlite`. The database SHALL be a rebuildable cache and journal, while live Zotero and Host Bridge remain authoritative.

#### Scenario: Concurrent initialization is safe
- **WHEN** two read/monitor operations start against an empty state directory
- **THEN** schema initialization is transactional and both observe one valid schema version

### Requirement: Resident automation SHALL enforce authority tiers
Default scheduled work SHALL be limited to indexing, reading, monitoring, notifications, maintenance analysis, and reports. Workflow submission SHALL require an enabled named automation policy or an interactive request; Zotero apply-back SHALL retain Host approval; destructive maintenance SHALL require a current human decision.

#### Scenario: Default cron cannot submit
- **WHEN** the shipped schedule is validated
- **THEN** no default job can reach the workflow submit operation

### Requirement: Librarian Skill SHALL use three coherent references
The `zotero-librarian` Skill SHALL directly link comprehensive resident operations, automation policy, and state/recovery references. Resident operations SHALL cover every service command and receipt; automation policy SHALL cover workflow delegation, provider profiles, concurrency, cron, maintenance, and interactions; state/recovery SHALL cover freshness, atomic updates, handles, uncertain outcomes, and installation. Persona files SHALL NOT contain hidden execution constraints.

#### Scenario: Resident hard constraints are visible
- **WHEN** an agent loads only the Librarian `SKILL.md`
- **THEN** it can determine authority, freshness, scheduling, completion, and failure rules without reading persona text

#### Scenario: Self-owned work keeps one policy owner
- **WHEN** the Librarian encounters a supported self-owned agent workflow
- **THEN** it delegates the finite handoff to the inherited Generic coordinator and does not duplicate that playbook in resident references

## REMOVED Requirements

### Requirement: Profile SHALL provide dedicated agent-owned workflow guidance
**Reason**: Agent-owned research workflow policy belongs to Generic and is included by composition.
**Migration**: Use the Generic coordinator or the relevant task Skill.

### Requirement: Profile SHALL include non-blocking helper scripts
**Reason**: Three overlapping services are replaced by one resident service and one receipt contract.
**Migration**: Invoke the matching `zotero_librarian_service.py` command domain.

### Requirement: Librarian references SHALL use progressive domain disclosure
**Reason**: The existing reference set is fragmented and duplicates Minimum and Generic content.
**Migration**: Use the three directly linked resident references plus inherited Skills.

### Requirement: Librarian SHALL load command contracts by operation stage
**Reason**: Exact command contracts are owned by the inherited Minimum Skill rather than Profile command-card copies.
**Migration**: Load the Minimum command reference when exact CLI mechanics are needed.
