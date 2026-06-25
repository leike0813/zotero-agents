## MODIFIED Requirements

### Requirement: SkillRunner provider dispatch MUST preserve critical request paths under local transport pressure

SkillRunner submit, settlement, and request-level reconcile MUST NOT be blocked by idle reachability probing.

#### Scenario: prompt reconcile does not wait for reachability probe

- **WHEN** a SkillRunner request is registered for post-dispatch settlement
- **AND** the backend is due for reachability recovery probing
- **THEN** plugin SHALL reconcile the request directly without first awaiting the reachability probe
- **AND** a successful reconcile response SHALL mark the backend reachable.

#### Scenario: non-reachability timeout is inconclusive

- **WHEN** a `reconcile`, `background`, or `foreground-query` request times out
- **THEN** plugin SHALL record local transport pressure or request backoff
- **AND** plugin SHALL NOT mark the backend unreachable from that timeout alone.

#### Scenario: run-level terminal client error remains run-scoped

- **WHEN** a known SkillRunner request returns `400`, `404`, `410`, or `422`
- **THEN** plugin SHALL settle only that run as failed
- **AND** plugin SHALL NOT mark backend reachability failed.
