# Change: Fix Topic Details Timeline, Coverage, and Stats Rendering

## Why

Topic Details no longer matches the current split topic artifact shape:

- Timeline rendering still depends on legacy marker behavior and equal year
  spacing, while current artifacts have reliable `source_papers` and
  `timeline_events.events`.
- Coverage caveats show the caveat `type` but omit the important `note`.
- Runtime writes empty `statistics.time_span`, so the UI cannot display the
  real source paper year range.
- The standalone Stats tab is sparse and exposes a "Full Statistics" area
  without corresponding backend data.

## What Changes

- Render the timeline from `source_papers` pins and aggregated
  `timeline_events.events` milestone pins without changing artifact structure.
- Derive weighted timeline year intervals from source paper counts.
- Materialize source paper years and statistics time span in split finalize
  runtime.
- Show coverage caveat notes and merge lightweight statistics into Coverage.
- Remove the empty standalone Stats tab.

## Impact

This change only affects topic details presentation and split runtime
statistics materialization. It does not change workflow routing, Host apply
contracts, persistence layout, or the topic artifact section schema.
