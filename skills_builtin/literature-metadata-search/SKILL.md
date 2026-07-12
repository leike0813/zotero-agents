---
name: literature-metadata-search
description: Resolve and curate bibliographic metadata for one literature record from legitimate public sources. Use when user has a partial paper, book, thesis, report, preprint, or proceedings record and needs evidence-backed metadata.
---

# Literature Metadata Search

## Purpose

Find authoritative bibliographic metadata for the same work described by
`input.parent`, then return one canonical JSON object matching
`assets/output.schema.json`.

This skill is read-only. It does not import literature, fetch PDFs, update
Zotero, create notes, add tags, or call Zotero Host Bridge. It only resolves
metadata candidates and reports evidence.

## Inputs

Read `assets/input.schema.json` as the machine contract when the runtime exposes
skill assets.

- `input.parent`: the source record snapshot. Treat this as a generic
  bibliographic record, not as permission to access Zotero. Useful fields include
  `title`, `DOI`, `ISBN`, `itemType`, `fields`, and `creators`. The original title
  identifies the direct bibliographic work; do not treat a container title as an
  interchangeable substitute.
- `input.identifier`: optional pre-selected identifier from the upstream caller.
  Supported `type` values are `DOI`, `ISBN`, `PMID`, and `arXiv`.
- `input.diagnostics`: optional prior lookup diagnostics. Use these only to avoid
  repeating an already failed lookup path; do not treat them as evidence for new
  metadata.

If `input.parent` is missing or has no usable title, creator, or identifier,
return the failed output shape with `error.code: "invalid_input"`.

## Search Workflow

1. Inspect the record and normalize available identifiers:
   - DOI: strip `doi:`, DOI URLs, trailing punctuation, and compare
     case-insensitively.
   - ISBN: strip prefixes, spaces, and hyphens.
   - PMID and arXiv: compare normalized identifiers exactly.
2. Search by trusted identifiers first. Prefer DOI.org, Crossref, publisher
   pages, PubMed, arXiv, ISBN catalogs, library catalogs, and authoritative
   repository pages.
3. If no trusted identifier exists or identifier search is inconclusive, search
   with quoted title plus author/year/venue terms. Use OpenAlex, Crossref,
   Semantic Scholar, PubMed, arXiv, publisher pages, university repositories,
   thesis repositories, and library catalogs as appropriate for the item type.
4. Compare candidates against the input record before emitting metadata.
5. Return `succeeded` only for one trustworthy candidate. Return `skipped` when
   there is no trustworthy candidate, multiple conflicting candidates, or only
   weak/secondary evidence.

## Candidate Acceptance Rules

Accept a candidate when one of these conditions is met:

- A normalized input identifier exactly matches the candidate identifier, and the
  candidate has a title or core bibliographic fields.
- Without an identifier, the candidate is the same direct bibliographic work,
  the normalized title clearly matches, at least two independent signals also
  match, and an authoritative publisher, repository, university, or library
  landing page supports the match. Signals may include creator names, year,
  venue, publisher, volume/issue/pages, or thesis institution.

Reject or skip candidates when:

- The identifier differs from the input identifier.
- The title is only a partial, translated, or keyword-level match.
- The source describes a different edition, preprint/article pair, thesis/article
  pair, or conference/journal version and the input does not clearly identify
  that version.
- The candidate is a book, proceedings volume, journal issue, or other container
  for the input chapter, article, or contribution.
- Only one weak aggregator or search snippet supports the metadata.
- Candidate fields conflict and cannot be resolved from authoritative evidence.

## Metadata Rules

Only emit fields supported by evidence. Preserve the original `title` unless the
candidate is proven to be the same direct bibliographic work. When the candidate
is a container, preserve the direct-work title and use the applicable container
field instead. Use Zotero-compatible field names under `metadata.fields`:

- Common: `title`, `shortTitle`, `DOI`, `ISBN`, `ISSN`, `url`, `abstractNote`,
  `date`, `language`, `libraryCatalog`, `rights`, `accessDate`
- Journal/preprint: `publicationTitle`, `journalAbbreviation`, `volume`,
  `issue`, `pages`
- Book/chapter: `publisher`, `place`, `edition`, `series`, `seriesTitle`,
  `seriesNumber`, `numberOfVolumes`, `numPages`, `bookTitle`
- Conference: `conferenceName`, `proceedingsTitle`
- Thesis/report/archive: `university`, `thesisType`, `reportType`,
  `institution`, `archive`, `archiveLocation`, `callNumber`

Emit `metadata.itemType` only when the same high-confidence evidence proves that
the source record has a different Zotero bibliographic type. It must name a
regular bibliographic type such as `thesis`, `journalArticle`, or `bookSection`;
never emit `attachment`, `note`, or `annotation`. Do not put `itemType` in
`metadata.fields` and do not emit attachments, notes, tags, collections, related
items, or local file paths. Do not invent missing creators, identifiers, dates,
abstracts, or page ranges.

Creators belong in `metadata.creators`. Use `creatorType` and either
`firstName`/`lastName` or `name`. Preserve organization authors with `name`.

## Evidence

Every successful output must include at least one evidence entry. Prefer concise
entries with:

- `source`: source name such as `Crossref`, `Publisher`, `PubMed`, `arXiv`,
  `OpenAlex`, `WorldCat`, or `University repository`
- `url`: stable landing URL when available
- `identifier`: matched identifier when relevant
- `reason`: short explanation of why the candidate matches the input record

Evidence URLs must be legitimate public pages. Do not use login-gated pages,
institution proxy URLs, Sci-Hub, LibGen, or other piracy sources.

## Responsibilities

### Must Be Done By LLM

- Decide whether candidate metadata describes the same work as the input record.
- Compare titles, authors, venue, year, edition/version, and identifiers.
- Choose which fields are sufficiently evidenced.
- Explain non-fatal uncertainty through structured warnings.

### Must Be Done By Tools Or Schemas

- Validate final JSON against `assets/output.schema.json` when validation is
  available.
- Use `assets/input.schema.json` to interpret runner-provided input.

### Forbidden

- Do not call Zotero Host Bridge or any Zotero write capability.
- Do not create, update, import, attach, tag, delete, or retype Zotero items.
- Do not fetch PDFs or search for illegal full-text copies.
- Do not output Markdown fences, logs, explanations, or multiple JSON objects.
- Do not modify Zotero directly or include mutation surfaces other than the
  evidence-backed `metadata.itemType` recommendation.

## Output Contract

Return exactly one JSON object to stdout. It must match
`assets/output.schema.json`.

Successful result:

```json
{
  "kind": "literature_metadata_curation",
  "status": "succeeded",
  "source": "literature-metadata-search",
  "metadata": {
    "itemType": "journalArticle",
    "fields": {
      "title": "Example article title",
      "DOI": "10.0000/example",
      "date": "2026",
      "publicationTitle": "Example Journal",
      "url": "https://doi.org/10.0000/example",
      "libraryCatalog": "Crossref"
    },
    "creators": [
      {
        "creatorType": "author",
        "firstName": "Ada",
        "lastName": "Lovelace"
      }
    ]
  },
  "evidence": [
    {
      "source": "Crossref",
      "url": "https://doi.org/10.0000/example",
      "identifier": "10.0000/example",
      "reason": "Normalized DOI matches the input record."
    }
  ],
  "warnings": [],
  "error": {}
}
```

Skipped result:

```json
{
  "kind": "literature_metadata_curation",
  "status": "skipped",
  "source": "literature-metadata-search",
  "metadata": {
    "fields": {},
    "creators": []
  },
  "evidence": [],
  "warnings": [
    {
      "code": "metadata_not_found",
      "message": "No trustworthy metadata candidate was found."
    }
  ],
  "error": {}
}
```

Failed result:

```json
{
  "kind": "literature_metadata_curation",
  "status": "failed",
  "source": "literature-metadata-search",
  "metadata": {
    "fields": {},
    "creators": []
  },
  "evidence": [],
  "warnings": [],
  "error": {
    "code": "invalid_input",
    "message": "input.parent is required."
  }
}
```

Before final stdout, verify:

- The output is one JSON object with no Markdown wrapper.
- `kind` is exactly `literature_metadata_curation`.
- `metadata.fields` contains only evidence-backed supported fields.
- `metadata.itemType`, when present, is an evidence-backed regular bibliographic
  type and is never placed in `metadata.fields`.
- `metadata.creators` is present as an array, even when empty.
- `warnings` and `evidence` are arrays.
- `error` is `{}` unless `status` is `failed`.
