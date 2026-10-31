## Purpose

Provide Zotero-native authenticated page and download operations to authorized Agent tasks while retaining institution credentials and acquired full-text bytes in the user's local Zotero profile.

## ADDED Requirements

### Requirement: Authentication profiles SHALL outlive task resources
Host SHALL maintain named authentication profiles in the current Zotero profile using native website storage rules. Task pages, targets, downloads, and temporary files SHALL have separate lifetimes from authentication profiles.

#### Scenario: Normal restart preserves valid authentication
- **WHEN** Zotero restarts after a user authenticates in a managed profile
- **THEN** a new authorized task SHALL be able to open a new page using that profile's still-valid authentication
- **AND** old page, target, download, and task grant references SHALL be invalid
- **AND** Host SHALL NOT replay downloads, page actions, or mutations.

#### Scenario: Task cleanup preserves authentication
- **WHEN** a task completes or releases its pages and downloads
- **THEN** Host SHALL release only task-owned resources
- **AND** it SHALL retain the authentication profile without extending website-granted expiry.

#### Scenario: User explicitly signs out
- **WHEN** the user explicitly requests sign-out of a managed authentication profile
- **THEN** Host SHALL clear only that profile's authentication state and invalidate its active page targets
- **AND** other Zotero contexts SHALL remain untouched
- **AND** task acquisition permission alone SHALL NOT authorize sign-out, account switching, or profile deletion.

### Requirement: Browser acquisition SHALL require a trusted live task grant
Host SHALL admit acquisition operations only with a Host-issued grant bound to a live authorized ACP or SkillRunner task. Task approval SHALL cover acquisition for approved papers without per-action prompts. Acquisition permission SHALL be independent of mutation auto-approval.

#### Scenario: Approved task uses existing institution access
- **WHEN** a valid task opens a page for an ingested parent and its source facts
- **THEN** Host SHALL allow navigation and downloading under its grant without an additional first-use or per-action prompt
- **AND** authentication redirects through institution and publisher origins SHALL be allowed as part of that acquisition.

#### Scenario: Forged or ended task requests access
- **WHEN** the caller supplies only a run identifier, an approved boolean, another task's grant, or an ended task's grant
- **THEN** Host SHALL reject the operation before effects
- **AND** it SHALL NOT fall back to global or chat scope.

#### Scenario: Tasks share authentication but not resources
- **WHEN** two authorized tasks use one authentication profile
- **THEN** each task SHALL own distinct pages, targets, downloads, and temporary file references
- **AND** one task SHALL NOT operate on the other's resources.

### Requirement: Page operations SHALL return bounded credential-free facts
Host SHALL expose opaque profile, session, page, and target references and bounded observations of visible article identity and actionable targets. Target activation SHALL bind to the owning page revision. Host SHALL retain native objects, authentication data, and signed request details locally.

#### Scenario: Agent observes and activates a download target
- **WHEN** an authorized task observes a paper page
- **THEN** it SHALL receive bounded visible facts and opaque targets with page revision
- **AND** activation SHALL resolve the actual request privately within that page's authentication context.

#### Scenario: Page has changed since observation
- **WHEN** an Agent activates a target from an earlier page revision
- **THEN** Host SHALL return a structured stale-target result without activating another target.

#### Scenario: Login page contains private data
- **WHEN** a page is awaiting user authentication
- **THEN** Host SHALL expose the waiting state and safe navigation facts
- **AND** it SHALL NOT return credentials, authentication forms, cookies, tokens, native context identifiers, or signed download parameters
- **AND** the user SHALL enter credentials directly in the local window.

### Requirement: Authentication waits SHALL be bounded and observable
Opening an authentication window SHALL return promptly. A wait SHALL expire ten minutes after the window is opened for authentication; observations SHALL NOT reset the deadline. Closing, cancellation, or timeout SHALL end that wait and suppress further automatic authentication prompts in the batch.

#### Scenario: User completes authentication
- **WHEN** the user authenticates before the deadline
- **THEN** subsequent short observations SHALL allow the Agent to continue acquisition in the same context.

#### Scenario: User closes or cancels the wait
- **WHEN** the window is closed, the wait is canceled, or its deadline expires
- **THEN** Host SHALL return the distinct terminal reason to the Agent
- **AND** existing metadata and authentication configuration SHALL remain
- **AND** the batch SHALL continue only work that does not require another authentication prompt.

### Requirement: Downloads SHALL be asynchronous same-context operations
Host SHALL start a download from an observed target using the page's native authentication context, promptly returning a download reference. Short observation and cancellation calls SHALL report accepted, running, ready, failed, or canceled facts without holding a native mutation slot or transaction during network work.

#### Scenario: Download start response is lost
- **WHEN** the task retries the same download start with the same idempotency key and semantic input
- **THEN** Host SHALL return the existing download reference without starting a second request
- **AND** reuse of that key with different input SHALL fail.

#### Scenario: Response is a login page
- **WHEN** a successful HTTP status contains HTML rather than a valid PDF
- **THEN** Host SHALL report that no PDF was acquired and SHALL NOT return an importable PDF result.

#### Scenario: Download completes
- **WHEN** a same-context response passes PDF content and readability validation
- **THEN** Host SHALL return an attachment-ingress-only file reference and necessary validation/source facts
- **AND** it SHALL NOT expose file bytes, local paths, or signed request URLs to the Agent
- **AND** large transfers SHALL keep JavaScript memory bounded.

#### Scenario: Task ends during download
- **WHEN** its owning task terminates or is canceled
- **THEN** Host SHALL cancel outstanding acquisition work and release task resources subject to active import leases
- **AND** a late download callback SHALL NOT recreate usable task resources or mutate Zotero.

### Requirement: Native acquisition SHALL pass the declared pilot acceptance
The feature SHALL use Zotero-native capabilities without an external downloader runtime. Its initial acceptance SHALL cover Linux and Zotero 10 using CNKI and Lanzhou Jiaotong University CARSI, with actual runtime version recorded.

#### Scenario: Native persistence or download cannot meet acceptance
- **WHEN** isolated real authentication cannot survive normal restart under website rules or the native route cannot reliably acquire a matching PDF
- **THEN** the automatic feature SHALL remain unaccepted and its dependent implementation tasks SHALL stop
- **AND** it SHALL NOT silently substitute per-task login or an external browser runtime.
