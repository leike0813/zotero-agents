## ADDED Requirements

### Requirement: Documentation distinguishes packaging from runtime activation

Current-state Synthesis documentation SHALL describe the product-owned runtime
bundle and installer without claiming that the plugin launches, supervises, or
routes production requests to the service.

#### Scenario: Reader reviews the runtime topology

- **WHEN** a reader opens the Synthesis architecture and runtime documents
- **THEN** they SHALL see the supported platform matrix, verified installation
  boundary, and rollback behavior
- **AND** production ownership SHALL still be documented as in-process until a
  later cutover.
