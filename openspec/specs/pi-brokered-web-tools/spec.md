# Pi Brokered Web Tools Specification

## Purpose

Provide policy-mediated Web Search and anonymous Web Fetch for Built-in Pi turns, preserving provenance and bounded untrusted content.

## Requirements

### Requirement: Search sources are explicit and frozen

The system SHALL offer only curated Exa/Tavily/Brave MCP, direct Brave/SearXNG/Perplexity and OpenAI/Anthropic native sources. Only Exa SHALL default enabled. Saved order SHALL express fallback consent. A turn SHALL freeze enabled sources, configuration and credential identities/revisions. An enabled native source referencing the exact active model configuration SHALL move to the head for that turn only. Loading/saving SHALL remain offline; explicit testing SHALL operate on one complete saved source independently of enabled-chain admission.

#### Scenario: Same provider with a different account
- **WHEN** a source references a different model configuration from the active model
- **THEN** its saved priority remains unchanged

#### Scenario: Settings change during a turn
- **WHEN** saved source order changes
- **THEN** the active turn retains its original chain and later turns receive the new order

#### Scenario: Disabled source is tested
- **WHEN** an explicit test targets a complete saved disabled source
- **THEN** only that source executes under existing permission/credential policy without enabling it or selecting a fallback source

### Requirement: Search test evidence follows saved source identity

Explicit tests SHALL identify source/request/configuration/credential identity and require actual complete source search evidence. Tests SHALL NOT retry, change enablement/order, certify other sources, resume tasks or lift model subscription pause. Enablement/order-only edits SHALL preserve applicable evidence; endpoint, authentication or native model changes SHALL invalidate it. Applicable billing SHALL be disclosed before dispatch.

#### Scenario: Source configuration changes during a test
- **WHEN** the result arrives after its target/authentication/model identity changes
- **THEN** it cannot certify the new configuration or replace a newer request result

#### Scenario: Source only returns a connection success or partial response
- **WHEN** actual completed search evidence is absent
- **THEN** its test is not reported as completed even if transport succeeded

### Requirement: Search preserves provenance and stops unsafe fallback

`web_search` SHALL accept only query and optional maxResults defaulting to five in range one through ten. Each source SHALL dispatch at most once. Unavailable, known terminal failure and no_results SHALL permit the next source; cancellation, policy denial, contract failure and unknown outcome SHALL stop. Every attempt SHALL have durable started/terminal evidence before publishing aggregate success. Results SHALL discriminate raw_results and grounded_answer, identify query/source, carry external_untrusted, and omit private provider fields. Raw records SHALL contain URL/title/snippet/optional publishedAt. Grounded answers SHALL contain bounded answer/citations/optional actualQueries and provided/unavailable source evidence. Missing citations SHALL NOT be inferred.

#### Scenario: Unknown source outcome
- **WHEN** a dispatched source disconnects without a terminal response
- **THEN** the chain reports unknown and no next source starts

#### Scenario: Native search did not run
- **WHEN** a provider returns prose without provider-defined completed search evidence
- **THEN** the source fails as search_not_performed and permitted fallback proceeds

### Requirement: Fetch is anonymous and bounded

`web_fetch` SHALL accept only one URL and perform anonymous GET without cookies, credentials, referrer, cache or retry. It SHALL return requestedUrl/finalUrl/contentType/optional title/text/truncated and external_untrusted. URL SHALL be bounded to 8 KiB, redirects to five, decompressed body to 5 MiB, extracted UTF-8 to 50 KiB, idle to 30 seconds and total to two minutes. Overflow SHALL abort without partial success. HTML SHALL use detached DOM with active/control nodes removed and preserve readable blocks/lists/links; text and JSON SHALL be allowed, other media SHALL fail.

#### Scenario: HTML contains scripts and links
- **WHEN** permitted HTML is fetched
- **THEN** readable text and link destinations survive without executing scripts or reading host page DOM

#### Scenario: Multibyte text exceeds the output limit
- **WHEN** extracted UTF-8 exceeds 50 KiB
- **THEN** a valid UTF-8 prefix is returned with truncated true

### Requirement: Every outbound hop follows shared address policy

The system SHALL reject userinfo, invalid schemes and metadata targets, classify all DNS A/AAAA addresses and actual peer evidence, and validate every redirect. Public endpoints SHALL require HTTPS. Private cleartext SHALL require exact origin Local Network approval and omit credentials except approved loopback. Fixed provider credentials SHALL stay on official origins; SearXNG SHALL allow only one explicit Authorization value bound to its origin. Provider/MCP redirects SHALL NOT cross origin. Missing network evidence SHALL fail closed.

#### Scenario: Public hostname resolves to mixed addresses
- **WHEN** DNS includes a forbidden address
- **THEN** no outbound request is admitted

#### Scenario: Redirect targets metadata
- **WHEN** a response redirects to a metadata endpoint
- **THEN** that hop is refused
### Requirement: ChatGPT native search uses official completed grounding

ChatGPT native search SHALL use the selected registration and public Responses endpoint with shared authentication, quota and actual-terminal policy. It SHALL retain the sealed outbound network boundary, one dispatch per source, actual search-call evidence and supplied citations. Missing service capability SHALL fail visibly without restoring private endpoints or changing source implicitly. An outbound network policy denial SHALL settle the provider and then fail with the project's own network code, so a sanitized stream failure never masks the real reason and no native error or private body reaches the attempt or the UI.

#### Scenario: Answer has no completed search

- **WHEN** the SIWC response contains prose but no completed native search evidence
- **THEN** the source cannot report grounded success

#### Scenario: Native search returns citations

- **WHEN** a completed official search returns bounded answer and citation annotations
- **THEN** existing external-untrusted grounding preserves supplied citations and source attempt identity
