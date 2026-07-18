## ADDED Requirements

### Requirement: Bootstrapper and Regulator SHALL share one upstream-based Tag Standard
The Tag Bootstrapper and Tag Regulator skill packages MUST carry byte-identical `references/tag_standard.md` files derived from the Tag Regulator upstream standard, preserving its unaffected structure and domain guidance while applying the builtin workflow status policy.

#### Scenario: Either packaged Tag Standard is reviewed or consumed
- **WHEN** the Bootstrapper or Regulator reads its packaged Tag Standard
- **THEN** both skills SHALL expose the same facet, naming, field hierarchy, vocabulary governance, and workflow status rules
- **AND** changes unrelated to workflow status SHALL retain the upstream document structure and guidance
