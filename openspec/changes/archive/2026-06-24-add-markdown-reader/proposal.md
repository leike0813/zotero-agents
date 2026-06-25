# add-markdown-reader

## Why

Markdown attachments and several in-plugin Markdown preview surfaces currently use separate renderers. This duplicates parser configuration, sanitizer behavior, math handling, and line-break behavior, which makes regressions likely when one surface is improved.

## What Changes

- Add a shared content-side Markdown renderer with behavior-preserving profiles.
- Add an internal Markdown attachment reader tab with common reader controls.
- Route Dashboard, Synthesis Workbench, transcript panels, and deep-reading digest modal rendering through the shared core.
- Add a preferences switch that defaults the internal Markdown reader on.

## Non-Regression Requirement

Existing surfaces must preserve their current visible behavior unless the change is an intentional reader improvement. In particular, transcript line breaks, blank lines, code blocks, fallback text rendering, and error text wrapping are compatibility requirements.
