## ADDED Requirements

### Requirement: Metrics worker wait is bounded and outside DB ownership
Production metrics routing SHALL apply the existing five-second hard deadline and
SHALL NOT retain a production DB transaction or lock while waiting for HTTP,
queue, or worker completion.

#### Scenario: Metrics task waits behind layout
- **WHEN** a metrics task is admitted behind an active layout task
- **THEN** its wait remains bounded by the shared queue and hard deadline without retaining DB ownership

### Requirement: Control plane remains responsive under mixed compute load
Health, handshake, and shutdown SHALL remain responsive while layout or metrics
occupies the worker or waiting queue.

#### Scenario: Worker is saturated
- **WHEN** the shared pool has one active task and two queued tasks
- **THEN** health and handshake return O(1) pool snapshots and shutdown completes within its configured budget
