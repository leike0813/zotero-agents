## MODIFIED Requirements

### Requirement: Candidate and unit models SHALL be ordered and immutable
Each candidate SHALL expose a kind, stable identity, label, scoped selection context, and optional parent identity. Each prepared unit SHALL expose ordered members and member identities, member count, merged scoped context, a safe label, and an optional shared target parent.

Atomic parent, attachment, child, and note candidates SHALL scope the top-level selection items to the current member only. The ordered canonical item array SHALL contain that member only; parent identity SHALL use a portable ref. It SHALL NOT contain a raw grouped selection tree, native item ID, or source filesystem path.

#### Scenario: Admission follows confirmed planning
- **WHEN** a confirmed plan has been admitted for execution
- **THEN** downstream build, preflight, duplicate guarding, and queueing use the same immutable unit membership without replanning or regrouping

#### Scenario: Literature sources expand from multiple selected parents
- **WHEN** a literature-source selector expands attachments from multiple selected parents and groups them with `each`
- **THEN** every unit's scoped selection contains only its current attachment and no selected parent entries
- **AND** every unit retains the parent identity associated with that attachment


### Requirement: Host queue admission SHALL consume confirmed v2 prepared units
Host queue admission SHALL occur only after the Host has produced a confirmed Input Planning v2 plan and duplicate guarding has selected unchanged prepared units.

#### Scenario: Remote client submits workflow input
- **WHEN** a Host Bridge client submits a workflow
- **THEN** the client SHALL provide explicit `selection` containing only complete portable refs
- **AND** the Host SHALL reject client-supplied candidates, input plans, prepared units, or grouping results

#### Scenario: Prepared unit reaches admission
- **WHEN** an allowed prepared unit enters the submission seam
- **THEN** its member order, member count, group identity, scoped context, and task label SHALL remain immutable
- **AND** downstream execution SHALL NOT rerun raw-selection requirements or grouping

## ADDED Requirements

### Requirement: Named source policies SHALL preserve task semantics
Literature selection SHALL emit one source per paper with parent-over-direct precedence, Markdown preference, earliest-PDF basename match and earliest Markdown/PDF fallback. MinerU SHALL process only directly selected PDFs or all eligible PDFs of a selected parent. Metadata selection SHALL resolve regular parents and deduplicate parent refs; note export SHALL expand generated notes of parents while retaining directly selected notes; digest-image selection SHALL resolve one unique digest note; bundle selection SHALL accept only ordered top-level regular refs. General selection acquisition SHALL NOT perform these transformations.

#### Scenario: A direct PDF has sibling PDFs
- **WHEN** MinerU receives only that direct PDF
- **THEN** it emits only that PDF as an input unit

#### Scenario: Same paper has multiple Markdown sources
- **WHEN** the literature selector chooses among those attachments
- **THEN** creation time, PDF stem matching, filename and stable input ordering preserve the declared existing source preference

### Requirement: Workflow file sources SHALL resolve only at the local adapter
Workflow selection, task and durable input DTOs SHALL carry source attachment refs rather than source paths. Final local preparation SHALL use the canonical attachment descriptor to supply provider input and SHALL fail on unavailable files without guessing paths.

#### Scenario: File disappears after selection
- **WHEN** the final adapter reads a missing attachment descriptor
- **THEN** source preparation fails without replacing the locked ref or using a native-ID fallback
