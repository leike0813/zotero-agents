## ADDED Requirements

### Requirement: Lexical work SHALL have an independent budget

Library, evidence and Topic lookup SHALL permit published-index retrieval to proceed when lexical work reaches its own deadline. Responses SHALL retain current verified hits, report the method and coverage actually used, and keep the existing source and publication basis for continuations.

#### Scenario: A lexical scan runs out of time

- **WHEN** lexical work exhausts its budget and the vector path verifies hits
- **THEN** the response includes the verified vector hits and reports limited lexical coverage

### Requirement: Foreground retrieval SHALL tolerate concurrent callers

Search calls sharing a service instance SHALL wait in a bounded cancelable queue before sending an expensive retrieval RPC. Control requests, reverse Host reads and health checks SHALL stay available. Admission and recovery SHALL spend the original request budget.

#### Scenario: Six callers search through a slow working encoder

- **WHEN** six searches arrive together and all can finish inside their deadlines
- **THEN** each caller receives its verified results, and the service stays ready

#### Scenario: A canceled search is waiting

- **WHEN** a caller cancels while waiting for admission
- **THEN** its queued request is removed before dispatch
