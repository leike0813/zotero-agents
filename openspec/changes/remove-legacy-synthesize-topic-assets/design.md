# Design

## Apply Hook Ownership

`applyResult.mjs` is not a legacy implementation detail. It is the synthesis
layer host-persistence bridge used by create/update workflows. The hook moves
from:

```text
workflows_builtin/synthesis-layer/synthesize-topic/hooks/applyResult.mjs
```

to:

```text
workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs
```

The implementation stays functionally equivalent. Error text may remain
topic-synthesis oriented, but it must not imply that a legacy workflow remains
published.

## Builtin Workflow Package

The synthesis-layer package only publishes:

- `create-topic-synthesis/workflow.json`
- `update-topic-synthesis/workflow.json`

`workflows_builtin/manifest.json` must include both workflow manifests and the
neutral apply hook. It must not include the removed legacy workflow.

## Skill Packages

The builtin skill registry should expose `create-topic-synthesis` and
`update-topic-synthesis`. It must not expose `synthesize-topic`.

The deprecated shared `topic-synthesis-runtime` package is deleted because
runtime scripts are package-local in each current skill.

## Workbench Routing

Workbench task submission should target the create workflow for a new topic
synthesis run. Update actions remain topic-state driven elsewhere.

## Spec Cleanup

Active specs should describe the current create/update workflow contract. Archive
specs remain historical and are not edited.
