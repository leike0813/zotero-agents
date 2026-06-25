## Context

Builtin literature workbench hooks receive canonical result JSON from SkillRunner and ACP-compatible backends. Several skills expose `warnings`, `error`, `status`, or `kind` fields as part of their output schema, but hook behavior is inconsistent: some hooks drop warnings, some ignore diagnostics, and `tag-regulator` treats `error != null` as an automatic apply blocker.

The desired behavior is to trust the actual apply operation more than the agent-authored diagnostic field. If usable artifacts or mutation fields are present, the hook should try to apply them and preserve diagnostics for review.

## Goals / Non-Goals

**Goals:**

- Normalize extraction of `warnings/error/status/kind/reason` across affected hooks.
- Keep `warnings` visible in success and skip returns.
- Attach skill diagnostics to skip returns and thrown apply failures.
- Allow valid `tag-regulator` mutations to apply even when `error` is non-null.

**Non-Goals:**

- Changing provider-level success/failure semantics.
- Changing output schemas or skill instructions.
- Adding new UI surfaces for diagnostics.
- Rewriting unrelated workflow package logic.

## Decisions

- Add a package-local helper for diagnostic extraction rather than central runtime behavior. The affected inconsistency lives in workflow hook business code, and a local helper avoids changing every workflow or provider.
- Preserve existing skip branches for missing required business inputs. A missing `note_path`, malformed mutation arrays, or unresolved artifact remains an apply-level inability to proceed; the change only prevents diagnostic fields from being treated as hard blockers.
- Return `skill_diagnostics` as structured data and append compact diagnostics to thrown error messages. This keeps tests and callers from relying on full human text while still making failures actionable.
- Update `tag-regulator` to validate mutation fields independently from `error`. This preserves conservative mutation rules for malformed payloads while allowing recoverable agent self-diagnostics.

## Risks / Trade-offs

- [Risk] Applying when `error` is non-null could write stale or partial data. -> Mitigation: hooks still require valid business fields and artifacts before writing.
- [Risk] Error messages become noisy. -> Mitigation: diagnostics are compact and structured; full raw objects are only included when safely serializable.
- [Risk] Helper shape becomes another implicit contract. -> Mitigation: keep it package-local and covered through hook-level tests rather than exposing it as public API.
