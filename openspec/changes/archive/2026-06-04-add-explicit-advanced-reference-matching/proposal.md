# Add Explicit Advanced Reference Matching

## Summary

Add an explicit Advanced Reference Matching flow for Synthesis. The existing Reference Sidecar refresh and workflow apply paths remain lightweight and deterministic; the new flow uses `referenceMatcher.ts` only when the user explicitly runs it, automatically accepts deterministic/high-confidence matches, and stores uncertain results as reviewable proposals.

## Motivation

Reference Sidecar refresh must stay fast enough for Zotero's single-process UI loop. The richer matcher can improve library cleanup and citation graph quality, but it is too heavy and too semantically uncertain for automatic refresh/apply paths.

## Scope

- Add explicit service/host/UI commands for advanced matching and proposal actions.
- Add a Proposal + Fact persistence model for reference binding and canonical merge decisions.
- Keep refresh/apply lightweight and guard against reconnecting the heavy matcher.
- Update active Synthesis docs/specs to distinguish lightweight and advanced matching.

## Non-Goals

- Do not run advanced matching during Reference Sidecar refresh or workflow apply.
- Do not rebuild citation graph cache automatically after matching.
- Do not add a new standalone Workbench top-level page; the review UI belongs under Index.

