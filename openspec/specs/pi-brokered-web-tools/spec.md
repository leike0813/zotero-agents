# Pi Brokered Web Tools Specification

## Purpose

Provide policy-mediated Web Search and anonymous Web Fetch for Built-in Pi turns, preserving provenance and bounded untrusted content.

## Requirements

### Requirement: Search sources are explicit and frozen

The system SHALL offer only curated Exa/Tavily/Brave MCP, direct Brave/SearXNG/Perplexity, and OpenAI/Anthropic native sources. Only Exa SHALL default enabled. Saved order SHALL express fallback consent. A turn SHALL freeze enabled sources, configuration and credential revisions. An enabled native source referencing the exact active model configuration SHALL move to the head for that turn only.

#### Scenario: Same provider with a different account
- **WHEN** a source references a different configuration from the active model
- **THEN** its saved priority remains unchanged

#### Scenario: Settings change during a turn
- **WHEN** saved source order changes
- **THEN** the active turn retains its original chain and later turns receive the new order

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