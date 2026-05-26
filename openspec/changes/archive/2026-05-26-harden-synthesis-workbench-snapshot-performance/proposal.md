## Summary

Harden Synthesis Workbench snapshot performance after the persistence governance changes.

The change prevents local UI state changes from triggering full Synthesis service
snapshot reads, keeps Workbench snapshot reads side-effect free, reads
Literature/Citation state from lightweight projections, avoids startup double
snapshot posts, and moves chrome UI icon usage to 32px assets.

## Motivation

The Workbench currently routes ordinary UI actions such as filter updates and tab
selection through `getSynthesisSnapshot()`. After the KG and persistence changes,
that snapshot path can read many canonical/projection assets and can enqueue
Literature Registry rebuild work. This makes UI interactions expensive and lets a
read-only UI refresh mutate persistent job/projection state.

Large 1024px PNGs are also used as small toolbar/menu/progress icons, causing
unnecessary image decode and scale work in chrome UI surfaces.

## Scope

- Add a lightweight snapshot input facade and cache it in the Workbench tab host.
- Route pure UI actions through cached snapshot input rather than full service reads.
- Make Synthesis snapshot reads side-effect free.
- Read Literature/Citation Workbench data from projection files or latest usable
  legacy projection only.
- Send only one real initial Workbench snapshot.
- Add 32px small icon assets and use them for toolbar/menu/progress icons.

## Out of Scope

- Replacing the Workbench full DOM render architecture.
- Running user data repair or cleanup.
- Rebuilding or restoring local Literature/Citation data.
- Adding dependencies or changing Git history.
