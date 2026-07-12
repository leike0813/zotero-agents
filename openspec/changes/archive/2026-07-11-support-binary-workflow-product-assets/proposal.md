# Support Binary Workflow Product Assets

## Summary

Extend workflow product storage so apply hooks can persist text and binary assets from result bundles, inline text, or host-local files without decoding binary data as UTF-8.

## Motivation

The Products area currently materializes every asset through a text resolver. PDF and image products therefore cannot be registered safely, and multi-file workflows cannot request atomic product creation.

## Modified Capabilities

- `workflow-product-storage`

## Non-Goals

- No research-specific workflow behavior.
- No new archive format or Product UI redesign.
- No workflow allowlist.
