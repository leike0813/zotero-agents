## ADDED Requirements

### Requirement: Workflow Synthesis client SHALL expose fourteen explicit members
The client adapter SHALL explicitly project `workflowApply.applyLiteratureDigest`, `workflowApply.applyTopicPlan`, `workflowApply.applyTopicSynthesisResult`, `topics.getReport`, `artifacts.readPaperArtifacts`, and the nine declared `tags` members. Adding a client or sidecar method MUST NOT widen this projection.

#### Scenario: Native client gains a method
- **WHEN** the canonical Synthesis client adds an unrelated command
- **THEN** Workflow conformance remains unchanged until an explicit contract change names the member

### Requirement: Workflow Synthesis calls SHALL preserve invocation-late dependencies
A cached Workflow Host composition MAY capture adapter functions but SHALL resolve the current default Synthesis client and current Host-effect ports for every call. It MUST NOT retain a stale client, repository, or runtime global.

#### Scenario: Default client changes between calls
- **WHEN** two calls use the same Workflow projection after the default client is replaced
- **THEN** the second call uses the current client and preserves the same public contract

### Requirement: Reverse Host effects SHALL use existing typed ports
Native Synthesis operations that require library reads, tag effects, related-item effects, artifact reads, or export delivery SHALL use the existing typed Host ports. The Workflow facade MUST NOT become a reverse transport or authorization source.

#### Scenario: Tag promotion requests a Host effect
- **WHEN** the native application needs a Zotero tag mutation
- **THEN** it invokes the canonical typed Host-effect port and returns typed evidence through the Synthesis result
