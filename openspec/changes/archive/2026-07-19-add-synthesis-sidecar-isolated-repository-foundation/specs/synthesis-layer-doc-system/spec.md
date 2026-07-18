## ADDED Requirements

### Requirement: Documentation distinguishes foundation from cutover
Synthesis runtime, persistence, performance, packaging, supervision, README, and Stage 1 documentation SHALL describe the persistent isolated three-table repository as WS5 infrastructure and SHALL identify WS6 shadow parity and WS7 atomic single-writer cutover as future work.

#### Scenario: Reader cannot mistake shadow writes for production ownership
- **WHEN** a maintainer reads the Synthesis architecture and progress documents
- **THEN** the documents state that production database, canonical files, engines, and public client routing remain plugin-owned
