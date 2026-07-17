# Multilingual metadata rules

## Authority and identity

The authoritative value is the form used by the direct work in its original
publication context. English completeness, Latin script, or availability in a
large cross-disciplinary index does not make a record more authoritative than
an original-language publisher, journal, repository, university, or library
record.

Use translated and romanized forms to find and match candidates. Keep them as
`alternateTitles` evidence. Do not replace an authoritative original-script
title, creator name, journal, conference, university, institution, or publisher
with those forms.

## Chinese records

- Determine publication language from the work or an authoritative record, not
  from author nationality, affiliation, country, or the language of a search
  snippet.
- Preserve simplified or traditional Chinese as published. Do not convert
  scripts solely for normalization.
- Preserve Chinese creator names and order from an authoritative source. Pinyin
  and English names are matching evidence, not safe replacements.
- For mainland works, prefer the journal, publisher, degree-granting
  institution, institutional repository, China DOI, and publicly available
  Chinese bibliographic sources.
- For traditional-Chinese works, also consider Airiti Library, TSSCI, Taiwan
  thesis repositories, university repositories, journal sites, and library
  catalogs.

## Other scripts

Apply the same roles to Japanese, Korean, Cyrillic, Arabic, Hebrew, Devanagari,
Thai, Greek, and other scripts: preserve an authoritative original-script value;
use romanization or translation for retrieval and matching; overwrite only when
an authoritative source proves the replacement is itself the work's published
form.

## Safe partial updates

Rejecting a translated title or romanized creator list does not invalidate the
whole candidate. Apply independently evidenced language-neutral facts such as
identifiers, dates, volume/issue/pages, edition, publisher, institution,
container roles, URL, and item type. If the complete creator list is not
verified, leave `creators` empty and mark `creatorCompleteness` as `incomplete`
or `unknown`.

## Conflict checks

Even an exact identifier is not permission to ignore a material conflict.
Review direct-work title identity, document type, edition, preprint versus
published version, thesis versus derived article, and container versus
contribution. Return `skipped` when authoritative evidence cannot resolve such a
conflict. Return `verified_no_change` only when the current record is already
canonical.
