## ADDED Requirements

### Requirement: Related Items Host batches SHALL be typed and receipt-exact

`effects.related_items.apply_batch` SHALL accept at most twenty-five deterministic effect requests and return one valid receipt for every and only requested effect ID. The port SHALL preserve request ordering for correlation while allowing per-effect results to differ.

#### Scenario: Receipt is an exact partition
- **WHEN** every requested effect ID appears exactly once with a valid outcome
- **THEN** the application may coordinate each effect's durable state
- **AND** unrelated or reordered domain outcomes cannot be applied to another effect

#### Scenario: Receipt is missing, duplicated, or foreign
- **WHEN** a receipt omits a requested ID, repeats an ID, includes an unknown ID, or has an invalid outcome
- **THEN** the whole current Host batch is treated as malformed
- **AND** no effect in that batch is falsely marked externally applied
