# Design: Review Writing Strategy Outline

Stage 40 no longer asks the agent to write `positioning`. The core synthesis
payload writes `review_outline` as review-writing strategy guidance:

- `topic_importance`: why this topic is worth reviewing.
- `writing_strategies[]`: multiple candidate ways to organize a review.
- `recommended_strategy_id`: the preferred strategy for the current evidence.

Each strategy has a thesis, a writing strategy, a section plan, suitability,
risks, and source paper references. Runtime validates references against the
current workset and verifies that the recommended strategy exists.

The final artifact no longer contains a `positioning` section. Topic Details
Overview renders topic boundary from `topic.scope_boundary` and review-writing
guidance from `review_outline`.
