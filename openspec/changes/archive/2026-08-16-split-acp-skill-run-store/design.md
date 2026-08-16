## Context

`acpSkillRunStore` remains a large facade after persistence, workspace data
plane, and transcript mirror extraction. Remaining concerns are status
predicates, controller registry, permission queue, runtime catalog,
conversation actions, and workspace selection.

## Goals / Non-Goals

**Goals:**

- Give each concern one module and one narrow interface.
- Keep dependencies one-way through host callbacks.
- Preserve observable behavior and test contracts.

**Non-Goals:**

- Changing ACP record schema, transcript projection, or provider protocol.
- Merging ACP and SkillRunner run stores.
- Removing test reset orchestration.

## Decisions

### Six focused modules

- `acpSkillRunStatus`: pure status predicates.
- `acpSkillRunControllerRegistry`: controller and setup-controller maps,
  purposes, detach promises, shutdown iteration.
- `acpSkillRunPermissionQueue`: per-run permission queues and resolution.
- `acpSkillRunRuntimeCatalog`: runtime catalog and mode/model/effort state.
- `acpSkillRunActions`: user/controller actions that orchestrate records,
  controllers, permissions, and workspace changes.
- `acpSkillRunWorkspaceSelection`: selected request identity and implicit
  selection.

### Host-callback dependencies

Focused modules never import `acpSkillRunStore` values. They expose
`configureXxxHost` and delegate to typed store-provided callbacks.
`acpSkillRunStore` configures hosts and keeps the backing state and record
ownership. This is an interface split with dependency inversion; the backing
state remains in the store host.

### Direct caller imports

Callers import focused modules directly. `acpSkillRunStore` does not re-export
moved functions.

## Risks / Trade-offs

- [Large import migration] -> Callers and tests migrate in the same change;
  behavior contracts are locked by existing suites.
- [Host surface grows] -> Each host callback is typed and configured once in
  the store reset/startup path.
- [Action module still broad] -> Actions share the same dependency surface and
  lifecycle, but no longer own record persistence.

## Migration Plan

1. Add boundary tests for each module and host wiring.
2. Implement focused modules, then remove moved code from the store.
3. Migrate callers and tests to direct imports.
4. Update specs and run focused/full verification.
