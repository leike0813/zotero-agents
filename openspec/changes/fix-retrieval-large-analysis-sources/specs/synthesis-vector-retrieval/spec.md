# Spec Delta

## ADDED Requirements

### Requirement: Retrieval SHALL read large canonical analysis sources in bounded ranges

Vector retrieval SHALL index the complete canonical text of eligible managed analysis sources within the managed payload budget and a 1,048,576 UTF-16 unit canonical-text limit. Sources exceeding the 262,144 UTF-16 unit single-read limit SHALL use the private evidence range protocol. Indexed fragments SHALL retain their managed note identity, logical source version and absolute UTF-16 range in the canonical root (`$`).

#### Scenario: An eligible analysis exceeds the single-read limit

- **WHEN** a retrieval catalog includes a valid managed analysis above 262,144 and at or below 1,048,576 UTF-16 units
- **THEN** maintenance reads and verifies consecutive ranges of at most 65,536 UTF-16 units until it has covered the complete canonical source
- **AND** each response matches the item, managed note, logical version, format and root location requested, and each page boundary preserves complete Unicode characters
- **AND** Workbench index previews and semantic search can verify fragments beyond UTF-16 offset 262,144 and open the corresponding Zotero item.

#### Scenario: An analysis becomes invalid before publication

- **WHEN** the source exceeds its total budget, a page is unreadable or fails identity, version or range verification, or the final catalog reports a changed source
- **THEN** maintenance reports a source failure without publishing an incomplete replacement
- **AND** the persisted previous publication and the existing rebuild or update suspension rules are preserved.
