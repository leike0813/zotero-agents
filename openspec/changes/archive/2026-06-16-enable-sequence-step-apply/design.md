# Design

`apply_result` is a sequence-step declaration, not a provider-facing skill
input. The host runtime owns the declaration and invokes the selected workflow
hook after the ACP step returns a successful provider result.

Each step may declare:

```json
{
  "apply_result": {
    "workflow_id": "literature-translator",
    "on_failure": "continue"
  }
}
```

`workflow_id` defaults to the step `skill_id`. `on_failure` defaults to
`continue`; the runtime records diagnostics and continues downstream steps.
`fail_sequence` is reserved for workflows that need apply failure to terminate
the sequence.

Step apply receives the same core context as final apply: target parent,
bundleReader, resultContext, original step request, and step run result. The
hook also receives `sequenceStep` metadata identifying the step id, index,
target workflow id, skill id, and whether the step is the declared final step.

Sequence state stores step apply status so resumed runs can avoid repeating an
already successful apply. Failed or skipped step applies may be retried by a
later continuation.

When the declared final step owns `apply_result`, the foreground final apply
seam records a skipped final apply rather than invoking the parent workflow
hook again.
