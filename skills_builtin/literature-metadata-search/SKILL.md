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
   - Multi-line `fields.extra`: recognize line-prefixed `DOI:`, `ISBN:`,
     `arXiv:`, and `PMID:` values without treating unrelated lines as part of
     the identifier.
2. Search by trusted identifiers first. Prefer DOI.org, Crossref, publisher
   pages, PubMed, arXiv, ISBN catalogs, library catalogs, and authoritative
   repository pages.
3. If no trusted identifier exists or identifier search is inconclusive, search
   with quoted title plus author/year/venue terms. Use OpenAlex, Crossref,
   Semantic Scholar, PubMed, arXiv, publisher pages, university repositories,
   thesis repositories, and library catalogs as appropriate for the item type.
4. When the direct work was originally published in Chinese, continue to an
   authoritative original Chinese source that can verify the complete
   Chinese-character author names and order. Prefer the official journal,
   publisher, degree-granting institution, institutional repository, China DOI,
   or publicly accessible Chinese bibliographic metadata.
5. Compare candidates against the input record before emitting metadata.
6. Return `succeeded` only for one trustworthy candidate. Return `skipped` when
   there is no trustworthy candidate, multiple conflicting candidates, or only
   weak/secondary evidence.

## Candidate Acceptance Rules

Accept a candidate when one of these conditions is met:

- A normalized input identifier exactly matches the candidate identifier, and the
  candidate has a title or core bibliographic fields, provided there is no
  material conflict in work type, version, title identity, or publication facts.
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

### Direct-work Identity And Authority

Only emit fields supported by evidence. Preserve the original `title` unless the
candidate is proven to be the same direct bibliographic work. When the candidate
is a container, preserve the direct-work title and use the applicable container
field instead. Use Zotero-compatible field names under `metadata.fields`:

Treat the form used by the direct work in its original publication context as
authoritative. English completeness, Latin script, or availability in a large
cross-disciplinary index does not make a record more authoritative than an
original-language publisher, journal, repository, university, or library
record. Use translated and romanized forms for retrieval and matching, not as
replacements for authoritative original-script values.

Protect each bibliographic role explicitly. A translated, romanized, or
secondary-source value must not replace an authoritative original-script
`title`, creator name, journal, conference, university, institution, or
publisher. Store a translated or romanized title under `alternateTitles`; map a
container to its Zotero container field; retain other forms only as matching
evidence unless an authoritative source proves that they are the published form
of the direct work.

### Supported Fields And Roles

- Common: `title`, `shortTitle`, `DOI`, `ISBN`, `ISSN`, `url`, `abstractNote`,
  `date`, `language`, `libraryCatalog`, `rights`, `accessDate`
- Journal/preprint: `publicationTitle`, `journalAbbreviation`, `volume`,
  `issue`, `pages`
- Book/chapter: `publisher`, `place`, `edition`, `series`, `seriesTitle`,
  `seriesNumber`, `numberOfVolumes`, `numPages`, `bookTitle`
- Conference: `conferenceName`, `proceedingsTitle`
- Thesis/report/archive: `university`, `thesisType`, `reportType`,
  `institution`, `archive`, `archiveLocation`, `callNumber`

Treat direct-work identity, alternate names, and containers as different roles:

- `metadata.originalTitle` identifies the authoritative original-script title.
- `metadata.alternateTitles` contains translated, romanized, abbreviated, or
  alternate forms for matching and evidence only. Never copy them into
  `metadata.fields.title` when an authoritative original-script title exists.
- `metadata.language` and `metadata.script` describe the direct work only when
  evidenced.
- `metadata.containers` records journal, book, proceedings, conference,
  institution, or series roles; also map an evidenced container to the correct
  Zotero field rather than replacing the direct-work title.
- `metadata.creatorCompleteness` is `complete`, `incomplete`, or `unknown`.
  Emit a non-empty replacement creator list only when it is `complete`.

### Item Type And Forbidden Metadata

Emit `metadata.itemType` only when the same high-confidence evidence proves that
the source record has a different Zotero bibliographic type. It must name a
regular bibliographic type such as `thesis`, `journalArticle`, or `bookSection`;
never emit `attachment`, `note`, or `annotation`. Do not put `itemType` in
`metadata.fields` and do not emit attachments, notes, tags, collections, related
items, or local file paths. Do not invent missing creators, identifiers, dates,
abstracts, or page ranges.

## Multilingual And Original-script Metadata

### Language Determination

Determine the direct work's original publication language from `input.parent`
or an authoritative original record. Author nationality, name characters,
affiliation, publication country, a translated title, or the language of a
search snippet is not sufficient and must not trigger original-script
replacement.

This rule applies to journal articles, conference contributions, books, book
sections, theses, reports, preprints, proceedings contributions, and other
direct bibliographic works. It is about the work's publication language, not the
identity of an author.

### Chinese Author Encoding

Creators belong in `metadata.creators`. Use `creatorType` and either
`firstName`/`lastName` or `name`. Preserve organization authors with `name`.
When the direct work's original publication language is Chinese, emit the
complete author list in its authoritative Chinese-character form and original
order. Encode every personal `author` in the single Zotero `name` field, for
example
`{ "name": "张三", "creatorType": "author" }`; do not split the name into
`firstName`/`lastName` and do not emit `fieldMode`. Encode an organization
`author` with the same `name` shape. If the source provides both Chinese and
romanized or translated names, emit only the Chinese author list.

Do not guess, infer, or back-transliterate Chinese characters from pinyin,
romanized, or translated names. For a work originally published in another
language, preserve the officially published author form even when the authors
are Chinese.

### Chinese Sources And Script Preservation

Preserve simplified or traditional Chinese as published; do not convert scripts
only for normalization. For mainland Chinese works, prefer official journals,
publishers, degree-granting institutions, institutional repositories, China DOI,
and publicly available Chinese bibliographic sources. For traditional-Chinese
works, also consider Airiti Library, TSSCI, Taiwan thesis repositories,
university repositories, journal sites, and library catalogs.

### Other Scripts

Apply the same original-script roles to Japanese, Korean, Cyrillic, Arabic,
Hebrew, Devanagari, Thai, Greek, and other scripts: preserve the authoritative
published form, use romanization or translation for retrieval and matching, and
overwrite only when authoritative evidence proves the replacement is the work's
published form.

### Safe Partial Updates

Original-script protection does not block language-neutral corrections. An
evidenced identifier, date, volume, issue, pages, edition, publisher,
institution, container role, URL, language, or item type may still be returned
when a translated title or romanized creator list is rejected. Evaluate these
fields independently instead of discarding an otherwise trustworthy candidate.

### Creator Completeness

A non-empty `metadata.creators` array is a complete replacement list. Never emit
a partial creator list. Set `metadata.creatorCompleteness: "complete"` whenever
emitting a non-empty complete replacement list.

If the complete Chinese-character author list cannot be verified, set
`metadata.creatorCompleteness` to `"incomplete"` or `"unknown"`, emit
`metadata.creators: []` as an empty array so the caller preserves existing creators,
continue with other evidence-backed fields, and add a warning with code
`native_creator_names_unverified`. Do not emit the known subset as a replacement.

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

Chinese-language succeeded result:

```json
{
  "kind": "literature_metadata_curation",
  "status": "succeeded",
  "source": "literature-metadata-search",
  "metadata": {
    "itemType": "thesis",
    "originalTitle": {
      "value": "隧道衬砌病害智能识别研究",
      "language": "zh-CN",
      "script": "Hans"
    },
    "language": "zh-CN",
    "script": "Hans",
    "creatorCompleteness": "complete",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "date": "2024",
      "university": "某大学",
      "thesisType": "博士学位论文"
    },
    "creators": [
      {
        "creatorType": "author",
        "name": "张三"
      }
    ]
  },
  "evidence": [
    {
      "source": "University repository",
      "url": "https://example.edu/thesis/123",
      "reason": "The authoritative degree record verifies the title and complete Chinese author list."
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

When authoritative evidence confirms the current record is already canonical,
return `status: "verified_no_change"` with empty fields and creators. This is a
successful verification outcome, distinct from unresolved `skipped`.

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
- Translated and romanized title forms occur only in `alternateTitles`, not as
  replacements for an authoritative original-script title.
- A non-empty `metadata.creators` is a complete, evidence-backed replacement
  list with `creatorCompleteness: "complete"`; unverified native creator names
  leave it empty with completeness `incomplete` or `unknown`.
- A work originally published in Chinese uses one `name` field for each personal
  author and never splits that name into `firstName` and `lastName`.
- `warnings` and `evidence` are arrays.
- `error` is `{}` unless `status` is `failed`.
