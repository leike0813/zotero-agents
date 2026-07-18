## ADDED Requirements

### Requirement: Publication lifecycle identity is owned by in-window post

The profiler SHALL create a publication lifecycle identity only after observing that publication's `panel_post` inside the active profile window. Acknowledgements for an unknown identity SHALL be classified as bounded out-of-window diagnostics and SHALL NOT participate in post, Shell, child, or render identity completeness.

#### Scenario: Preparation publication acknowledges after profile start

- **WHEN** a publication posted before profile start emits child or render acknowledgement during the profile
- **THEN** the acknowledgement is recorded as out-of-window
- **AND** no zero-post lifecycle is added to the profile identity set.

### Requirement: Publication labels come from canonical lifecycle metadata

Profiler surface, kind, form, cause, and delivery labels SHALL be derived from coordinator lifecycle metadata associated with `publicationId`. No surface SHALL use another surface's default label builder.

#### Scenario: Skills transcript acknowledges

- **WHEN** an ACP Skills transcript delta reaches child and render completion
- **THEN** both acknowledgement metrics identify `acp-skills`, `transcript`, and `delta`
- **AND** no `acp-chat` surface label is emitted for that lifecycle.

### Requirement: Render duration ends at accepted DOM completion

The profiler SHALL measure host-observed publication duration from post to accepted render completion. Rejected, failed, unknown, or out-of-window acknowledgements SHALL NOT contribute to the accepted render duration family.

#### Scenario: Renderer reports failure

- **WHEN** a posted publication terminates with `render-failed`
- **THEN** it remains attributable as a failed lifecycle
- **AND** it is excluded from accepted render duration.
