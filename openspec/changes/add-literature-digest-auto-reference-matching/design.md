# Design: Literature Digest Auto Reference Matching

## Decision

The auto matching step is a local apply-time post-process, not a second queued
workflow job. `literature-digest` first writes its three generated notes, then
passes the newly written references note to the same reference matching apply
logic used by the explicit `reference-matching` workflow.

## Parameter Defaults

`literature-digest` only owns the boolean switch
`auto_reference_matching`. It passes `{}` as the reference-matching parameter so
the reference-matching workflow remains the single source of truth for matching
defaults such as `data_source`, thresholds, and citekey template.

## Failure Handling

Auto matching failures are reported in the `literature-digest` apply result as
`auto_reference_matching.warning`. The already written digest artifacts remain
valid and are not rolled back.
