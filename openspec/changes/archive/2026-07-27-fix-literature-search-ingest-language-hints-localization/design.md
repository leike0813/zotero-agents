## Context

The workflow request compiler already preserves `languageHints` and
`searchBreadth`. The ACP prompt builder renders only fields explicitly referenced
by a runner's `entrypoint.prompts.common`, and this runner predates both fields.
The same addition left every package locale catalog and user-facing workflow
document incomplete.

## Goals / Non-Goals

**Goals:**

- Make all five existing search controls visible in the ACP startup prompt.
- Provide complete parameter title/description coverage in every declared
  package locale.
- Keep site and embedded help aligned with the manifest.
- Add focused regression checks at the prompt and raw-locale boundaries.

**Non-Goals:**

- Change parameter names, defaults, enum values, request wire format, or skill
  behavior.
- Add localized labels for enum option values; the current workflow-localization
  contract does not model them.
- Alter runtime input files or ACP prompt-builder behavior shared by other
  skills.

## Decisions

- Extend the runner template rather than the generic prompt builder. The runner
  owns which dynamic parameters its agent receives; automatic generic injection
  would change unrelated skill prompts and duplicate the runner contract.
- Include `searchBreadth` with `languageHints`. Both fields were introduced
  together and were omitted by the same selective projection, so fixing only the
  reported field would retain the same defect.
- Add translations directly to the package locale catalogs. They are the SSOT
  consumed by workflow parameter localization; manifest English remains the
  fallback outside declared locales.
- Update the site sources and run the existing help generator. Generated
  `addon/content/help-docs` files are never hand-edited.
- Assert rendered prompt semantics and raw localized key completeness, not full
  translated wording or complete prompt text, to avoid brittle tests.

## Risks / Trade-offs

- [Translation quality across ten locales] → Use concise terminology matching
  the adjacent parameter entries and review generated documentation diffs.
- [Generated-help drift] → Rebuild help only from updated site documentation and
  inspect the generator output.
- [Prompt formatting change] → Limit assertions to the two newly projected
  values and preserve all existing wording and runtime-input guidance.
