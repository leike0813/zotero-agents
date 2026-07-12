## Context

The Host Bridge ingest API intentionally accepts a title or identifier so it can
serve multiple callers. This workflow directly drives its interactive agent to
write one paper at a time, so candidate-quality behavior belongs in the Skill
contract rather than in the shared mutation API.

## Decisions

### Candidate evidence gate

Before a candidate is shown for user confirmation or written to an ingest
payload, the agent must attempt identifier resolution, verify authoritative
metadata, and attempt a legal public PDF. The candidate table records
identifier status, metadata source, landing URL, and PDF outcome. Bare titles
and unverified search snippets are ineligible.

### Identifier-free fallback

Identifier-free and PDF-free candidates remain eligible only if an authoritative
metadata source supports the record, available bibliographic fields do not
conflict, the search attempts are disclosed as `identifier_not_found`, and the
user confirms the candidate. The existing landing-page attachment recovery path
remains responsible for missing PDFs after ingest.

### Chinese literature routing

Chinese-likelihood is inferred from the query or candidate title, author, or
venue. Journal and conference candidates add China DOI, official venue pages,
CNKI, and Wanfang; theses add CNKI, Wanfang, degree institutions, and
repositories; books and ISBNs add PDC, publishers, and library catalogs. These
sources provide metadata, landing pages, and only legally public PDFs; login,
proxy, and restricted-full-text paths remain excluded.

## Non-Goals

- Do not make identifiers or PDFs globally mandatory in `literature.ingest`.
- Do not add browser automation, authenticated retrieval, or access-control
  bypasses.
- Do not expand the final concise result schema with candidate-search logs.
