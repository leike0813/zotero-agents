# Metadata Resolution

Use this reference at Stage 40. Resolve only the candidate named by the gate.
The objective is a typed Zotero record for the same direct bibliographic work,
not a plausible substitute.

## Resolution Order

1. Normalize every candidate identifier.
2. Query the identifier's authoritative registry or direct landing source.
3. Inspect the publisher, repository, library, or issuing-organization record
   for the direct work.
4. Compare title, creators, date, type, container, edition, and material
   version.
5. Use secondary indexes to corroborate facts and identify conflicts.
6. If no identifier resolves, execute the title path with original-script
   identity and independent corroboration.
7. Emit exactly one `qualified` or `not_attempted` payload for the candidate.

Search snippets and model knowledge can suggest queries. They are not accepted
metadata evidence.

## Identifier Normalization

| Identifier | Canonical form | Reject or investigate |
| --- | --- | --- |
| DOI | Lowercase suffix without `doi:`, resolver URL, query string, or surrounding punctuation | Invalid syntax, unrelated resolver target, or a title/type/version conflict |
| ISBN | Valid ISBN-10 or ISBN-13 without separators | Invalid checksum, ISBN for a container when the candidate is a chapter, or a different edition |
| PMID | Decimal identifier only | A record describing a cited work instead of the candidate |
| arXiv | Canonical category/id or numeric id; retain version as material evidence | A published article treated as the same item without explicit version judgment |

Identifier acceptance requires:

- exact normalized equality between candidate, evidence, match object, and
  `metadata.identifiers`;
- authoritative direct-work evidence;
- no unresolved material conflict in title, work type, or version;
- `match.method: "identifier"` and the matching `normalized_identifier`.

An exact identifier does not authorize copying metadata from a different
container, correction, review, dataset, or derived publication.

## Title-path Acceptance

Use `match.method: "title"` only when all conditions hold:

- the authoritative original title normalizes to the same direct work;
- the landing URL represents that work;
- at least two independent corroborating signals agree, such as ordered
  creators, year, issuing institution, container, document type, or distinctive
  subtitle;
- no material version conflict remains;
- `corroborating_signals` names the actual signals.

Two values repeated by copies of one weak aggregator are not independent
signals. A translated-title match plus one search snippet is insufficient.

When strong identity cannot be established, emit `not_attempted` rather than
guessing.

## Evidence Roles

### Authoritative

Examples:

- DOI, ISBN, PMID, or arXiv registry record for the direct work;
- publisher or journal article page;
- official repository record for a preprint, thesis, report, or institutional
  publication;
- issuing organization for a standard or report;
- university catalog or thesis repository for a thesis;
- publisher or national-library record for a book or edition.

At least one `qualified` payload evidence entry must use
`source_role: "authoritative"`.

### Secondary

Cross-domain indexes, citation databases, library aggregators, project pages,
and author profiles can corroborate or reveal conflicts. Their facts must be
attributed to the exact URL inspected.

### Weak

Search snippets, scraped citation pages, unattributed bibliographies, and model
recall are query leads only. They cannot qualify a record.

Each evidence entry records the source, direct URL, role, reason, and concrete
facts observed. Preserve source wording in `raw_title` when it helps distinguish
original, translated, or container text.

## Direct Work And Related Records

Classify the record before mapping fields:

- **Direct work versus container:** a journal, proceedings, book, series, or
  repository page is not the article, paper, chapter, or thesis.
- **Edition:** different ISBNs, revision statements, publishers, or edition
  numbers may denote separate bibliographic objects.
- **Preprint versus article:** link the relation, but keep separate item
  identities when publication status, identifier, pagination, or substantive
  version differs.
- **Thesis versus article:** shared title fragments and authorship do not merge
  the thesis and derived article.
- **Book versus chapter:** the chapter title belongs in `fields.title`; the book
  belongs in a container field.
- **Correction, dataset, protocol, or commentary:** do not substitute it for the
  work it references.

If resolution reveals a different work, use
`reason_code: "identity_changed"`. If the relation is real but the material
version remains unresolved, use
`reason_code: "material_conflict_unresolved"`.

## Zotero Type And Field Roles

Choose the narrowest supported Zotero item type that describes the direct work:

| Direct work | Typical `itemType` | Important field roles |
| --- | --- | --- |
| Journal article | `journalArticle` | title, publication title, volume, issue, pages, date |
| Conference paper | `conferencePaper` | paper title, proceedings title, conference, place, date |
| Book | `book` | book title, edition, publisher, place, date, ISBN |
| Book chapter | `bookSection` | chapter title, book title, pages, publisher, editors |
| Thesis | `thesis` | thesis title, type, university, place, date |
| Report | `report` | report title, report number, institution, place, date |
| Preprint | Supported preprint type or the closest semantically correct Host type | repository, version, date, arXiv id |

`metadata.originalTitle.value` and `metadata.fields.title` name the same direct
work and must agree exactly for original-script records. Put the journal, book,
proceedings, university, institution, series, or repository in `containers` and
the corresponding item-specific Zotero field.

Do not copy arbitrary source keys into `fields`. Use only fields accepted by the
chosen Zotero item type.

## Titles And Original Language

Determine the original publication language from the direct authoritative
record, not from the language of an index page.

- `originalTitle` is the work's authoritative published title.
- `fields.title` equals `originalTitle.value`.
- `alternateTitles` contains translated, romanized, abbreviated, or separately
  published alternate forms with explicit roles.
- `containers` contains journal, book, proceedings, conference, university,
  institution, series, or repository titles.

For Chinese:

- preserve the authoritative simplified or traditional form as published;
- do not normalize one script into the other as the primary title;
- record the other script only when a source actually supplies it as an
  alternate form;
- never create a bilingual primary title by concatenating Chinese and English.

Apply the same original-script rule to Arabic, Cyrillic, Devanagari, Japanese,
Korean, and other non-Latin records. Romanization supports matching but does not
replace the primary title.

## Creator Integrity

Creators are ordered bibliographic data.

Use `creatorCompleteness: "complete"` only when an authoritative source verifies
the complete ordered list. Then:

- organizations or native names that should not be split use
  `{"creatorType": "...", "name": "..."}`;
- reliably segmented personal names may use `firstName` and `lastName`;
- do not mix romanized creators into an otherwise native-script list unless the
  authoritative record publishes that exact representation.

For a Chinese or other original-script work whose complete native creator list
cannot be verified:

- set `creatorCompleteness` to `incomplete` or `unknown`;
- set `creators` to `[]`;
- add warning code `native_creator_names_unverified`;
- set `needs_curation: true`.

Never write a verified partial list as if complete. Never replace missing native
names with translated or romanized names solely to avoid an empty array.

## Identifier And URL Roles

- All DOI values go only in `metadata.identifiers.doi`.
- Do not place DOI in `metadata.fields.DOI`.
- Do not place a `DOI:` line in `metadata.fields.extra`.
- The Host writes a native DOI field for supported item types and uses Extra
  only where the item type has no native DOI field.
- ISBN, PMID, and arXiv values use their named identifier keys.
- `landingUrl` is the stable direct-work page.
- PDF URLs are determined at Stage 50 and never inferred from a metadata landing
  page.

## Qualified Payload

This identifier-path example is structurally complete:

```json
{
  "action": "record_metadata",
  "candidate_id": "doi:10.5555/tunnel.001",
  "status": "qualified",
  "identifier_status": "resolved",
  "checked_sources": ["China DOI", "Official journal landing"],
  "match": {
    "method": "identifier",
    "direct_work": true,
    "material_conflict": false,
    "normalized_identifier": {
      "type": "DOI",
      "value": "10.5555/tunnel.001"
    }
  },
  "metadata": {
    "itemType": "journalArticle",
    "originalTitle": {
      "value": "隧道衬砌病害智能识别研究",
      "language": "zh-CN",
      "script": "Hans"
    },
    "alternateTitles": [
      {
        "value": "Intelligent Recognition of Tunnel Lining Defects",
        "role": "translated",
        "language": "en",
        "script": "Latn"
      }
    ],
    "language": "zh-CN",
    "script": "Hans",
    "creatorCompleteness": "incomplete",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "date": "2024",
      "language": "zh-CN",
      "publicationTitle": "隧道工程学报"
    },
    "creators": [],
    "identifiers": {
      "doi": "10.5555/tunnel.001"
    },
    "containers": [
      {
        "role": "journal",
        "title": "隧道工程学报"
      }
    ],
    "landingUrl": "https://doi.org/10.5555/tunnel.001"
  },
  "evidence": [
    {
      "source": "China DOI",
      "url": "https://doi.org/10.5555/tunnel.001",
      "source_role": "authoritative",
      "raw_title": "隧道衬砌病害智能识别研究",
      "identifier": "10.5555/tunnel.001",
      "reason": "The normalized DOI and original Chinese title match.",
      "facts": ["identifier", "original_title", "publication_year"]
    }
  ],
  "warnings": [
    {
      "code": "native_creator_names_unverified",
      "message": "The complete Chinese creator list was not verified."
    }
  ],
  "needs_curation": true
}
```

For a title-path payload, omit `match.normalized_identifier`, use
`identifier_status: "identifier_not_found"`, and include at least two concrete
`corroborating_signals`.

## Not-attempted Payload

Use a stable reason code and preserve the checked evidence:

```json
{
  "action": "record_metadata",
  "candidate_id": "title:ambiguous-work",
  "status": "not_attempted",
  "reason_code": "insufficient_same_work_evidence",
  "reason": "The original title matched, but creators and publication type could not be corroborated.",
  "checked_sources": ["Publisher search", "Cross-domain index"],
  "evidence": [
    {
      "source": "Cross-domain index",
      "url": "https://example.org/record/ambiguous-work",
      "source_role": "index",
      "raw_title": "An Ambiguous Work",
      "reason": "The index supplies a title but no reliable direct-work identity.",
      "facts": ["title_only"]
    }
  ],
  "warnings": [
    {
      "code": "weak_identity",
      "message": "The available record cannot support same-work acceptance."
    }
  ]
}
```

Legal `reason_code` values are:

- `identity_changed`;
- `material_conflict_unresolved`;
- `authoritative_metadata_unavailable`;
- `metadata_sources_unavailable`;
- `insufficient_same_work_evidence`;
- `unsupported_item_type`.

`not_attempted` is a terminal candidate metadata outcome. It does not trigger a
replacement prompt and it does not block processing other approved candidates.

## Examples And Anti-examples

### Accept: authoritative Chinese record

The DOI registry and journal landing agree on the Chinese title, DOI, year,
type, and complete ordered Chinese creator list. Store the Chinese title as
primary, the English title as `translated`, and the creators as ordered
single-field names.

### Accept with curation: creators not verifiable

The Chinese title and DOI are authoritative, but available pages show
inconsistent or abbreviated author lists. Keep the Chinese title, use an empty
creator list, add the required warning, and continue with
`needs_curation: true`.

### Reject: English translation overwrites Chinese title

An English index translates the Chinese title. Using that translation in
`fields.title` changes the original bibliographic identity. Keep it only in
`alternateTitles`.

### Reject: partial creator list

A search page shows the first author followed by “et al.” Writing that one
author and marking completeness `complete` creates false data. Use the
complete-or-empty rule.

### Reject: weak aggregator

A citation aggregator supplies title, year, and a DOI-like string but has no
direct landing evidence. It can guide further lookup; it cannot be the sole
authority for `qualified`.

### Reject: material conflict

The candidate is a conference paper, while the resolved DOI belongs to a later
journal article with a similar title. Record
`material_conflict_unresolved` or `identity_changed`; do not replace the
authorized work.

### Reject: DOI in `extra`

A payload contains `fields.extra: "DOI: 10.5555/example"`. Move the normalized
value to `identifiers.doi`. If another DOI representation conflicts, fail
closed rather than selecting one silently.
