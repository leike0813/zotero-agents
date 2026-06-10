# Design: Topic Details Timeline, Coverage, and Stats

## Timeline Layout

The timeline uses `source_papers[]` as the paper pin source. Valid paper years
define the span from `minYear` to `maxYear + 1`. Each interval `[year, year+1)`
belongs to papers with that exact year.

Interval widths are proportional to paper counts while preserving a minimum
width for empty or sparse years. For `k` papers in an interval of length `L`
starting at `L0`, paper pin `i` is placed at:

`L0 + (1 + 2i) * L / (2k)`, where `i = 0..k-1`.

Timeline events remain in `timeline_events.events[]`. Events are grouped by
year and displayed as milestone pins at the end boundary of the corresponding
year interval. A milestone hover/focus card lists all events for that year.

## Runtime Years

`source_papers.year` is normalized from workset entry fields, nested metadata,
and available artifact metadata. Runtime writes `statistics.time_span` from the
materialized source papers instead of empty placeholders.

## Coverage and Stats

Coverage shows a compact statistics dashboard. The standalone Stats tab is
removed because current backend data is intentionally lightweight.
