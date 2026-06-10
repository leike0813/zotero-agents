# Hard Cut Topic Synthesis Evidence Contract To `source_paper_refs`

## Summary

Topic synthesis split skills now use `source_paper_refs` as the agent-facing paper
reference field, but the finalize runtime and Host artifact contract still
materialize legacy evidence sections. This change hard-cuts the new topic
synthesis path to a single current-state evidence contract:

- agent-authored sections reference papers with `source_paper_refs`;
- runtime/Host materializes source paper metadata as `source_papers`;
- generated skill instructions stay current-state only.

## Goals

- Remove legacy evidence sections from split topic synthesis final artifacts.
- Make Host apply/storage/detail DTOs validate and expose `source_papers`.
- Keep skill runtime stage submit focused on current stage schema and flow.
- Prevent generated `SKILL.md` from documenting historical field names or
  migration language.

## Non-Goals

- No automatic migration of existing persisted topics.
- No compatibility adapter for legacy topic synthesis artifacts.
- No extra recursive legacy-field scanner in skill runtime submit.
