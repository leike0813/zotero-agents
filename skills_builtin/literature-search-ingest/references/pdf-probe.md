# PDF Probe

Use this reference at Stage 50. A PDF probe is complete only when the payload
contains exactly one terminal attempt for each hard route:
`authoritative_landing`, `open_access`, and `web_search`.

The objective is a legal, public, reachable PDF of the same direct work.
Metadata ingest may continue without a PDF after all routes are exhausted.

## Hard Route Order

### 1. Authoritative landing

Inspect, in order:

1. the DOI resolver or other normalized identifier landing page;
2. the publisher, journal, conference, repository, university, or issuing
   organization page;
3. explicitly linked HTML full text, download controls, supplementary record,
   or direct PDF URL belonging to the direct work.

Do not treat a landing page as a PDF. Follow only public links and verify the
response.

Query forms:

```text
https://doi.org/<normalized-doi>
site:<publisher-domain> "<original title>"
"<identifier>" site:<issuing-domain>
```

### 2. Open access

Inspect applicable sources:

1. DOI-based open-access indexes;
2. domain repositories such as arXiv or discipline repositories;
3. institutional repositories;
4. thesis repositories;
5. author, laboratory, project, or funder pages that legally expose the file.

Query forms:

```text
<normalized DOI> open access
"<original title>" repository
"<original title>" site:<institution-domain>
<author> "<distinctive title phrase>" pdf
```

An index assertion that a work is open access is a lead. Follow its URL and
verify the actual file.

### 3. Public web search

Use both original-title and identifier forms when available:

```text
"<authoritative original title>" filetype:pdf
"<normalized DOI>" pdf
"<original title>" "<first creator>" pdf
```

For non-Latin titles, search the original script first. Translated and romanized
queries are supplementary. Public web search cannot relax source legality or
identity checks.

## Reachability And Content Verification

A `found` attempt requires all of the following:

- the final URL uses HTTP(S);
- no account, subscription login, institutional proxy, or interactive approval
  is required;
- the final response is reachable;
- the content type begins with `application/pdf`;
- the response is the file, not an HTML landing, consent page, error page,
  viewer shell, or search result;
- the file's title, creators, identifier, venue, or other direct-work evidence
  matches the Stage 40 metadata;
- the source is legal and publicly shareable.

Inspect headers and, when necessary, the first page or embedded metadata. A URL
ending in `.pdf` is not enough. A server may return HTML, an access-denied page,
or another paper.

If a stable landing page is useful, record it separately as `landing_url`. The
`pdf_url` must point to the verified file response.

## Direct-work Identity

Accept the PDF only when it represents the Stage 40 direct work. Compare:

- DOI, ISBN, PMID, arXiv id, report number, or repository id;
- authoritative original title;
- ordered creators;
- work type and material version;
- year, container, issuing organization, and distinctive subtitle.

Reject:

- a citing paper;
- a thesis when the selected work is a derived article;
- a preprint when the selected item is the published article unless the
  relation and selected material version explicitly permit it;
- supplementary material, poster, slides, abstract booklet, correction, or
  dataset instead of the work;
- a same-title work by different creators.

Use `status: "mismatch"` and `identity_match: false` when a reachable file is
not the direct work.

## Status Semantics

| Status | Meaning |
| --- | --- |
| `found` | A legal, public, reachable, identity-matched `application/pdf` response was verified |
| `not_found` | The route was searched successfully but produced no usable PDF |
| `restricted` | A candidate file exists but requires login, subscription, entitlement, or other restricted access |
| `unavailable` | The planned route or service could not be accessed or does not apply in a usable way |
| `mismatch` | A retrieved or linked file belongs to another bibliographic object |
| `error` | The attempt failed because of a concrete network, parsing, or service error |

There is no `not_attempted` status. An empty search summary does not cover a
route. Record the source, exact query or URL, reachability, legality judgment,
identity result, and concise notes.

## Legal And Prohibited Sources

Accept public files from:

- publishers and journal sites;
- DOI or issuing-organization landing pages;
- recognized open-access and institutional repositories;
- author, project, laboratory, university, or funder pages;
- public domain repositories and lawful archives.

Do not use:

- piracy or unauthorized sharing sites;
- credentials, institutional proxy sessions, cookie transfer, or browser-login
  automation;
- URLs exposed only inside a private account;
- circumvention tools or paywall bypasses;
- a local file unrelated to the selected candidate.

ACP shell, public HTTP, and search tools may be used within their authorization
boundaries. Do not use the browser, Connector, CDP, or another user's login
session to obtain restricted content.

## Complete Found Payload

This payload covers all routes and selects the authoritative file:

```json
{
  "action": "record_pdf_probe",
  "candidate_id": "doi:10.5555/tunnel.001",
  "attempts": [
    {
      "route": "authoritative_landing",
      "source": "Official journal landing",
      "query_or_url": "https://doi.org/10.5555/tunnel.001",
      "status": "found",
      "identity_match": true,
      "legal_source": true,
      "reachable": true,
      "pdf_url": "https://journal.example.org/articles/tunnel.001.pdf",
      "content_type": "application/pdf",
      "landing_url": "https://journal.example.org/articles/tunnel.001",
      "notes": "DOI, Chinese title, and creators match the qualified metadata."
    },
    {
      "route": "open_access",
      "source": "Open-access index and institutional repositories",
      "query_or_url": "10.5555/tunnel.001",
      "status": "not_found",
      "identity_match": false,
      "legal_source": true,
      "reachable": true,
      "notes": "No additional public repository copy was found."
    },
    {
      "route": "web_search",
      "source": "Public web search",
      "query_or_url": "\"隧道衬砌病害智能识别研究\" filetype:pdf",
      "status": "not_found",
      "identity_match": false,
      "legal_source": true,
      "reachable": true,
      "notes": "Only the already verified publisher file appeared."
    }
  ]
}
```

The runtime chooses a usable file according to its deterministic route
preference. Do not omit later routes merely because an earlier route found a
file; all three are coverage evidence.

## Complete Missing Payload

PDF absence is a terminal probe outcome, not a workflow failure:

```json
{
  "action": "record_pdf_probe",
  "candidate_id": "doi:10.5555/tunnel.001",
  "attempts": [
    {
      "route": "authoritative_landing",
      "source": "Official journal landing",
      "query_or_url": "https://doi.org/10.5555/tunnel.001",
      "status": "not_found",
      "identity_match": true,
      "legal_source": true,
      "reachable": true,
      "notes": "The page exposes metadata but no public file."
    },
    {
      "route": "open_access",
      "source": "Open-access indexes and repositories",
      "query_or_url": "10.5555/tunnel.001",
      "status": "not_found",
      "identity_match": false,
      "legal_source": true,
      "reachable": true,
      "notes": "No repository copy was listed."
    },
    {
      "route": "web_search",
      "source": "Public web search",
      "query_or_url": "\"隧道衬砌病害智能识别研究\" filetype:pdf OR \"10.5555/tunnel.001\" pdf",
      "status": "not_found",
      "identity_match": false,
      "legal_source": true,
      "reachable": true,
      "notes": "No legal public copy was found."
    }
  ]
}
```

The candidate receives PDF status `missing`. The ingest payload omits `pdfUrl`
and keeps the authoritative `landingUrl`.

## Other Terminal Examples

### Restricted

```json
{
  "route": "authoritative_landing",
  "source": "Publisher download",
  "query_or_url": "https://publisher.example.org/download/123",
  "status": "restricted",
  "identity_match": true,
  "legal_source": true,
  "reachable": true,
  "content_type": "text/html",
  "landing_url": "https://publisher.example.org/article/123",
  "notes": "The download requires subscriber login."
}
```

Do not automate the login. Continue through the other routes.

### Mismatch

```json
{
  "route": "web_search",
  "source": "Public web search",
  "query_or_url": "\"Shared Article Title\" filetype:pdf",
  "status": "mismatch",
  "identity_match": false,
  "legal_source": true,
  "reachable": true,
  "content_type": "application/pdf",
  "notes": "The PDF has different creators and a different DOI."
}
```

Do not put the mismatched URL in `pdf_url`.

### Unavailable

```json
{
  "route": "open_access",
  "source": "Open-access index",
  "query_or_url": "10.5555/tunnel.001",
  "status": "unavailable",
  "identity_match": false,
  "legal_source": true,
  "reachable": false,
  "notes": "The public service was unavailable after the actual request."
}
```

## Anti-examples

### Reject: landing page reported as PDF

The response content type is `text/html`, but the attempt uses `status:
"found"` and stores the landing URL as `pdf_url`. Record the route as
`not_found` or `restricted` as appropriate and keep the page only as
`landing_url`.

### Reject: search summary without a route attempt

“No PDF on the web” does not record the exact query, source, reachability, and
identity result. The route remains uncovered.

### Reject: missing route

Only authoritative and open-access attempts are present. The hard gate must
reject the payload even if one route found a valid file.

### Reject: file with the wrong identity

A reachable public PDF shares the translated title but has different creators
and DOI. Use `mismatch`; do not attach it.

### Reject: restricted source treated as public

A browser session can view the publisher file because the user is logged in.
That does not make the URL public or reusable. Record `restricted` and do not
extract session credentials.

### Reject: illegal source

A file appears on an unauthorized sharing site. `legal_source` is false, so it
cannot use `found`; record a non-found terminal result for the route and
continue lawful searches.
