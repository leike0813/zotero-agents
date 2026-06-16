# persist-dashboard-product-assets

## Summary

Persist Dashboard product assets into the managed runtime product cache, tighten the builtin `manuscript-literature-framing` registration condition, and include workflow products in runtime persistence governance.

## Motivation

Dashboard product records currently may point at run workspace files. That makes long-term Products UI behavior depend on ACP or SkillRunner workspace retention, and it gives local and remote/bundle results different storage semantics. The Products area should instead own durable display copies under the plugin runtime root while keeping the product storage API available to any workflow that explicitly registers products.

## Modified Capabilities

- `workflow-product-storage`
- `manuscript-literature-framing`
- `runtime-persistence-governance`

## Non-Goals

- Do not add a workflow allowlist to `productStorage.registerProduct`.
- Do not add new Dashboard or runtime protocol actions.
- Do not turn legacy product repair into startup/runtime behavior.
- Do not change `remove-product` to cascade-delete cached assets.
