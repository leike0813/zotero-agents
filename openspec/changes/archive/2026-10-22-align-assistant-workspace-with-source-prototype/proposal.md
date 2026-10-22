## Why

Issue #36's resolved prototype has not reached the production Workspace completely: the Pi Skill Run page is missing, Pi Conversations have no creation entry, navigation remains one crowded row, and inactive source navigation is dropped. Existing adapter tests pass without exercising these entry points.

## What Changes

- Complete the two-lane, five-source shell with keyboard navigation, counts and attention.
- Add the Pi Skill Run child page and a shared conversation creation picker anchored to the existing banner button.
- Publish lightweight navigation for inactive sources without reading their transcript or owner regions.
- Correct Pi panel labels, controls, archive eligibility, identity and usage presentation using existing owner facts.
- Extend production DOM/publication regressions and update the Workspace documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-hardening`: complete source entry points, accessible navigation and shared creation menu.
- `assistant-workspace-publication-data-plane`: independent source-navigation delivery.

## Impact

Workspace shell/child UI, shared wire control vocabulary, publication runtime/host, Pi presentation adapters, existing Assistant/ACP tests and component documentation. No persistence migration, dependency addition or execution-policy change. The user explicitly chose current Pi semantics over prototype-only Chat/Research modes and clearing actionable attention on visit.
