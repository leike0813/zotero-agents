## ADDED Requirements

### Requirement: Citation Graph layout is the only production worker kernel
The bounded compute pool SHALL serve Citation Graph layout as its sole production
kernel without changing its one-active, two-queued, deadline, cancellation,
resource, fault, degradation, or shutdown bounds.

#### Scenario: Production layout uses a healthy pool
- **WHEN** the plugin submits an authenticated production layout request
- **THEN** it is scheduled as `citation_graph_layout.v1` under the existing pool bounds

#### Scenario: Production pool is busy or degraded
- **WHEN** the pool returns `worker_busy` or `worker_unavailable`
- **THEN** production routing fails the layout operation without local fallback

