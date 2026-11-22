# Proposal

## Why

In the dev profile, every selected parent failed while migration progress only showed how many groups had settled. The wizard also made the step buttons hard to find and left pending issue types easy to miss at final review.

## What Changes

- Reproduce and repair the parent-set write failure on an isolated dev-profile copy. Preserve the actual stage of a parent-set failure in safe diagnostics.
- Show apply outcomes as each selected parent settles.
- Place problem-step navigation beneath strategy choices and label the backward action as the previous step.
- Show whole-plan selection and pending issues at final review, with direct access to their problem groups. Include reasons discovered after a strategy changes.

## Capabilities

### Modified Capabilities

- `literature-artifact-migration` covers guided review, apply progress, and parent-set diagnostics.

## Impact

The migration service and trusted writer, the Dashboard migration view and its localized labels, and the existing service, UI, and Zotero acceptance tests.
