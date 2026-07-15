## MODIFIED Requirements

### Requirement: Replay publication acknowledgement is debug-exclusive

Replay SHALL publish target snapshots through a debug-exclusive sidecar and a narrow Workspace diagnostics port. The production Workspace core SHALL expose only an entirely elidable cold-path operation that obtains readiness, target child window, current revision, and forces publication for a specified tab; normal snapshot injection and child action handling SHALL contain no Replay acknowledgement state. The sidecar SHALL treat a missing message source as unverifiable rather than mismatched in Zotero privileged nested frames, and SHALL compare non-null publisher identities across direct and `wrappedJSObject` window representations before rejecting them as unrelated.

#### Scenario: Matching rendered publication completes

- **WHEN** the sidecar requests publication for a ready target tab and receives a message for that target snapshot with a newer revision
- **THEN** it SHALL wait until the target child's normal render listener has run and the next animation frame is reached before completing.

#### Scenario: Zotero omits the publisher source

- **WHEN** a target child in Zotero receives the matching newer snapshot but its `MessageEvent.source` is absent across the privileged nested-frame boundary
- **THEN** the sidecar SHALL accept the tab, revision, and captured child-window evidence and complete after render confirmation.

#### Scenario: Zotero exposes an equivalent wrapped publisher

- **WHEN** the observed publisher and expected shell window refer to the same browsing context through direct and `wrappedJSObject` representations
- **THEN** the sidecar SHALL treat them as the same publisher.

#### Scenario: Publication evidence does not match

- **WHEN** a message has a verifiably unrelated non-null publisher, wrong tab, stale revision, replaced frame window, or unrelated snapshot
- **THEN** the sidecar SHALL NOT acknowledge the publication.

#### Scenario: Publication wait terminates early

- **WHEN** timeout, abort, frame replacement, or child unload occurs before matching render confirmation
- **THEN** the sidecar SHALL reject with structured failure evidence and SHALL remove its listener and pending frame or timer work.

#### Scenario: Normal child rendering runs

- **WHEN** Chat, Skills, or SkillRunner child sidebars process ordinary snapshots
- **THEN** their render paths SHALL read no Replay drain property and SHALL send no Replay-specific child action.
