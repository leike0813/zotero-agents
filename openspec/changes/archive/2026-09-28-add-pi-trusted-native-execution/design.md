# Design

## Context

See proposal.md. C07 Gateway freezes tool definitions and admits effects; C06 prepares turns. Runtime persistence owns filesystem adapter selection. C08 must work in Zotero without importing Node-only modules into the plugin bundle.

## Goals / Non-Goals

**Goals:** One project-owned native tool module, canonical pre-policy claims, bounded outputs, and an owner-managed file manifest.

**Non-Goals:** A general shell parser, new Gateway authorization rules, transcript persistence, or C13/C16 UI workflows.

## Decisions

- Extend C07 classifier's return type to a value or promise and await it before admission. Keep synchronous implementations valid. This avoids a second classification path and lets path identity be checked before resource claims.
- Add narrow canonical path inspection to runtime persistence and fail closed where the host cannot prove link/reparse safety. Keep tool policy in C08; do not widen the platform facade with agent semantics.
- Build fixed Gateway definitions in C08. Use an in-process directory walker and `ignore` for restricted search. Shell receives an explicit replacement environment through Mozilla Subprocess; existing long-lived process adapters inherit ambient variables and are unsuitable.
- Store one atomic manifest per owner with opaque generated names and source fingerprint fields only. Reuse is based on source facts, never the mutable managed copy. Generated output uses staged promotion and enforced size quotas.
- Keep the literal-command classifier intentionally narrow; all uncertain syntax becomes opaque with conservative effects. This avoids presenting a partial shell parser as authority.

## Risks / Trade-offs

- Unprovable Windows reparse identity → hide affected tools until the adapter can establish safe containment.
- Direct subprocess stop may leave descendants → report uncertain termination; never claim a clean canceled outcome without proof.
- Full Node and Zotero suites have unrelated existing failures → use the approved targeted C08 Node and real-Zotero gates, including Windows, and record the exception without a full-suite pass claim.

## Migration Plan

Add C08 without changing current ACP or Workflow Host callers. New Pi turns opt into C08 definitions and runtime receipt after the owner integration lands. Rollback removes the definitions and leaves existing C07/C06 paths intact.
