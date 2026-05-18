# Refine Cross-Paper Synthesis for Review Workflow

## Summary

Topic synthesis currently produces usable overview sections, but Stage 5 has
too little structure to reliably support a later literature-review writing
workflow. The agent receives large context files and is asked to write final
sections directly, which encourages unsupported taxonomy, gap, and trend
claims.

This change makes cross-paper synthesis evidence-grounded. Stage 4 becomes the
only paper-level semantic extraction path. Stage 5 consumes validated paper
units, creates a cross-paper evidence map, and then writes review-oriented
sections whose claims can be traced back to evidence units.

## Problem

- Per-paper extraction is too weak and under-specified for downstream
  synthesis.
- Stage 5 can re-infer paper-level facts from large Markdown context, creating
  inconsistent or unsupported conclusions.
- Final sections lack review-oriented structures such as positioning,
  taxonomy, comparison matrix, debates, and review outline.
- Gaps can conflate local library coverage gaps with field-wide research gaps.
- Future literature review workflows cannot reliably consume the current
  artifact without asking an agent to infer structure again.

## Goals

- Add a validated paper-unit contract to per-paper analysis.
- Add a cross-paper evidence map before final section authoring.
- Add review-oriented final sections.
- Validate references from final sections to evidence-map candidates and paper
  evidence.
- Expose the new structures through topic detail and review input.

## Non-Goals

- Implement the full literature review writing workflow.
- Generate semantic taxonomy, claims, debates, or gaps in scripts.
- Reintroduce full artifact payloads or long bodies into SQLite.
- Preserve full compatibility with old topic synthesis section contracts.
