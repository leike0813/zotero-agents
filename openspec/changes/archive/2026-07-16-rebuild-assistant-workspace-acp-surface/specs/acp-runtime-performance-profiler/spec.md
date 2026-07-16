## ADDED Requirements

### Requirement: Profiler distinguishes steady continuity from rebase

The ACP runtime profiler SHALL record surface, kind, form, cause, materialization source, gap rejection, rebase page read, and rebase snapshot with low-cardinality canonical labels. Removed wire forms SHALL NOT remain as current-state labels.

#### Scenario: Valid steady delta renders

- **WHEN** either ACP surface accepts and renders a transcript delta
- **THEN** its identity contains matching post, Shell forward, child apply, and render-complete stages
- **AND** it contributes no gap, rebase, snapshot, panel, or frontend materialization.

### Requirement: Projected count diagnostics share one meaning

Profiler transcript metadata SHALL report `totalVisibleItemCount` and SHALL NOT interpret raw Chat or Skills store counts as selected-page continuity.

#### Scenario: Hidden source events advance

- **WHEN** source event sequence advances without a visible transcript mutation
- **THEN** profiler may record source work but does not report a visible-count or transcript-revision advance.
