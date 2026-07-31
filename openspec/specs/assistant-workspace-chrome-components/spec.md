# assistant-workspace-chrome-components Specification

## Purpose
Governs the componentization of Assistant child chrome regions as Preact components, ensuring synchronous failure-safe rendering, imperative transcript rendering behind a component boundary, and convergence of the SkillRunner source onto the shared assistant child page.
## Requirements
### Requirement: ACP child chrome regions are Preact components

The ACP child page SHALL render each non-transcript managed chrome region
(toolbar, banner, message counts, plan, hint, composer, context drawer,
details drawer, permission drawer) as a Preact component mounted at the
region's existing DOM mount. Region components SHALL receive all rendered
data as explicit props and SHALL NOT read ambient or module-level state
for region content.

Each region component SHALL be memoized with an equality boundary
containing only that region's user-visible content and open or collapsed
state. Equal region props SHALL produce zero DOM mutations inside the
region subtree.

#### Scenario: Unchanged region props preserve the subtree

- **GIVEN** a chrome region has rendered with props `P`
- **WHEN** a later render pass supplies props equal to `P` under the
  region's equality boundary
- **THEN** every DOM node in the region subtree SHALL keep its identity.

#### Scenario: Changed region props re-render only that region

- **GIVEN** managed regions have rendered for the selected owner
- **WHEN** a publication changes exactly one region's visible content
- **THEN** only that region's component SHALL re-render
- **AND** every other managed region's subtree SHALL stay element-wise
  identical.

### Requirement: Chrome rendering is synchronous and failure-safe

Chrome component rendering SHALL run synchronously inside the child's
publication apply path so that speculative rendering, commit-on-success,
and bounded render-failed acknowledgements keep working unchanged. A
throwing region render SHALL leave the previously committed DOM in place
and SHALL route to the existing failure recovery path.

#### Scenario: A region component throws

- **WHEN** a chrome region component throws during the apply of a
  publication
- **THEN** the previously committed region DOM SHALL remain in place
- **AND** the failure SHALL surface through the bounded render-failed
  acknowledgement path
- **AND** a later valid publication SHALL re-render the region without
  stale state.

### Requirement: Transcript rendering stays imperative behind a component boundary

The transcript region SHALL be hosted by a component wrapper that owns
its container element, but transcript content rendering, incremental
mutation effects, pagination, and virtualization SHALL remain imperative
operations on that container. Full transcript renders and the
loading/empty/failed placeholder SHALL be driven through wrapper props;
code outside the wrapper SHALL NOT write transcript container DOM through
any other path, except the bounded failure-recovery path, which MAY
hard-reset the container (unmounting the wrapper vnode first) before
re-rendering through the wrapper.

#### Scenario: Streaming mutation bypasses the component diff

- **WHEN** an accepted transcript delta appends or patches visible rows
- **THEN** the imperative mutation path SHALL apply the effect directly
  to the container
- **AND** the wrapper component SHALL NOT re-render or re-diff the
  transcript subtree.

#### Scenario: Loading state is wrapper-driven

- **WHEN** the selected owner switches to a loading owner
- **THEN** the wrapper SHALL render the loading placeholder from props
- **AND** no code outside the wrapper SHALL clear or fill the transcript
  container directly.

### Requirement: Assistant child page serves the SkillRunner source

The shared assistant child page (`acp-child.bundle.js`) SHALL boot with
`data-source="skillrunner"` from the SkillRunner page and SHALL render all
SkillRunner chrome regions through the same region components and props
equality boundaries as the ACP sources. SkillRunner-only DOM structures
outside the shared components SHALL NOT be introduced.

#### Scenario: SkillRunner page boots the shared child

- **WHEN** `skillrunner.html` loads with `data-source="skillrunner"`
- **THEN** the shared child runtime boots against the SkillRunner source
- **AND** chrome regions render through the region components with props-level memoization.

### Requirement: Context drawer renders SkillRunner task navigation

For the SkillRunner source, the context drawer component SHALL render the
workspace task navigation as Running and Completed sections containing
backend groups and task cards, preserving selected, related, and disabled
task states and the Completed-section collapse action. SkillRunner tasks
SHALL NOT be flattened into a generic context-entry list.

#### Scenario: SkillRunner navigation renders grouped tasks

- **GIVEN** an owner-navigation publication with running and completed task groups
- **WHEN** the context drawer renders for the SkillRunner source
- **THEN** tasks appear under their Running or Completed section and backend group
- **AND** collapse and selection state behave as they did in the legacy drawer.
