## Context

Synthesis must remain usable for large local Zotero libraries, but stress-tier
behavior may be degraded if it is bounded and diagnostic. Startup reconcile must
not explode bulk or structural drift into thousands of events or review cards.

## Goals / Non-Goals

**Goals:**

- Make performance budgets tier-aware and diagnostic.
- Ensure bounded output and truncation metadata on large reads.
- Prevent bulk/structural drift fan-out.
- Verify required indexes for the new identity, worker, discovery, and sync
  paths.

**Non-Goals:**

- No broad architecture rewrite solely to hit target-tier ideals.
- No exact UI text or large snapshot assertions.
- No unbounded synthetic data committed to the repo.

## Decisions

- Normal tier keeps stronger p95 targets.
- Target/stress tier may return progressive/degraded slices with diagnostics.
- Drift severity determines whether bounded dirty events are allowed.
- Bulk/structural drift records an incident and repair recommendation, not
  per-item fan-out.

## Risks / Trade-offs

- Synthetic performance tests can be environment-sensitive. Tests should assert
  stable behavior, boundedness, and diagnostics first, with timing thresholds
  limited to meaningful guardrails.
