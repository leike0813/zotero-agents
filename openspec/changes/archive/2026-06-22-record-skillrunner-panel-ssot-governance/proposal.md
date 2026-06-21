# Record SkillRunner Panel SSOT Governance

## Problem

The background refresh governance work removed heavy unscoped reads from
Dashboard and sidebar background paths, but the intermediate SkillRunner sidebar
implementation split foreground panel data across active rows, completed-window
reads, selected-request supplements, drawer state, and preserved selected rows.

That split caused correct performance isolation but incorrect foreground panel
behavior:

- completed SkillRunner runs could disappear until opened from Dashboard;
- submitting a new run could hide all completed rows;
- request-ready transitions could leave duplicate local and request rows;
- terminal transitions could leave stale running rows in the sidebar;
- toolbar and side-pane entrypoints could appear to attach to different
  SkillRunner panel state.

The behavior that worked before the refresh governance work was the unified
foreground run list. The problem was not that unified list semantics were wrong;
the problem was that the old implementation depended on unbounded history/full
payload reads.

## Goal

Record the follow-up governance rule: SkillRunner foreground panels use one
bounded snapshot builder as the single source of truth, while Dashboard and
background surfaces remain isolated on lightweight summary paths.

- align SkillRunner panel semantics with ACP Skills panel semantics;
- keep initial sidebar open, Dashboard jump, submit, request-ready, terminal
  transition, toolbar entry, and side-pane entry on the same panel state;
- use bounded lightweight SkillRunner history projections for the foreground
  panel, with exact selected-request supplementation;
- canonicalize SkillRunner panel identity so request-ready rows replace local
  pre-request rows instead of coexisting;
- keep drawer open/collapse actions presentation-only;
- preserve background refresh governance: background badges and Dashboard home
  refreshes must not read full SkillRunner payloads or unbounded history rows.

## Non-Goals

- Do not restore unbounded SkillRunner history reads.
- Do not read full payloads for unselected completed rows.
- Do not add pagination to the SkillRunner sidebar panel.
- Do not modify ACP or SkillRunner backend protocols.
- Do not delete user history or depend on clearing retained runs.
