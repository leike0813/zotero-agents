## MODIFIED Requirements

### Requirement: SkillRunner managed runtime

SkillRunner SHALL load the shared assistant child page
(`skillrunner.html` with `data-source="skillrunner"`) and SHALL be
refreshed only through the v1 publication plane; the visible layout and
controls SHALL be rendered through the managed Assistant runtime.

SkillRunner SHALL preserve backend protocol, output convergence, run
history, waiting_user/auth/cancel semantics, and assistant
revision/replacement audit semantics.

SkillRunner reply zone SHALL use the same managed textarea-plus-footer
structure. Its footer SHALL render Send in the leftmost `primary` group and
shortcut/status text in the `secondary` group. SkillRunner SHALL NOT be required
to render a usage gauge unless a future compatible snapshot explicitly enables
one.

SkillRunner Sessions drawer SHALL preserve the pre-migration workspace/task
organization inside the managed drawer shell. It SHALL render Running and
Completed sections, backend groups, active/finished task cards, selected and
related task states, disabled task states, and the Completed-section collapse
action. It SHALL NOT flatten SkillRunner tasks into a generic context-entry
list.

SkillRunner `assistant_process` entries with `processType` or
`correlation.process_type` equal to `tool_call` or `command_execution` SHALL be
projected as canonical `tool-call` transcript items. Reasoning-like or unknown
`assistant_process` entries SHALL be projected as canonical `thought`
transcript items.

#### Scenario: SkillRunner native semantics remain intact

- **Given** SkillRunner emits assistant revision or replacement data
- **When** the SkillRunner tab renders inside the Assistant shell
- **Then** the SkillRunner adapter preserves it as SkillRunner-owned revision metadata and details diagnostics
- **And** ACP Chat does not inherit SkillRunner-specific revision semantics.
