# Automation Policy

## Authority matrix

| Action | Cron | Interactive resident request | Required evidence |
| --- | --- | --- | --- |
| Refresh local index/catalog | Allowed | Allowed | Receipt and refresh/change counts |
| Search local projection | Allowed when the job declares it | Allowed | Cache freshness plus live confirmation for external claims |
| Read live library/Synthesis state | Allowed as one bounded pass | Allowed | Returned refs and freshness facts |
| Watch registered runs or sync notifications | Allowed as one bounded pass | Allowed | Run/event IDs and receipt |
| Produce hygiene, workflow-status, or attention proposal | Allowed | Allowed | Candidate reason and next live check |
| Plan a Zotero-managed workflow | Not shipped in cron | Allowed | Current selection, workflow validation, persisted plan |
| Submit a workflow | Never | Allowed only for the reviewed plan | Current operator instruction, `--allow-submit`, Zotero approval path |
| Execute a self-owned agent handoff | Never | Delegate to Generic | Handoff contracts, local validation, apply receipt |
| Mutate Zotero or apply agent output | Never | Use Generic/CLI contract | Current request, exact target/effect, Zotero-side approval |
| Destructive maintenance | Never | Requires current target-level human decision | Diagnostics, proposal, approval, post-state |

Local cache and journal writes are resident bookkeeping, not authority to change Zotero. A prior approval, old plan, pending workflow, cached candidate, or scheduled proposal cannot be promoted into a new write.

## Workflow mode and delegation

Choose workflow ownership from the live description. The resident plan helper supports Zotero-managed execution for the current selection. It produces runs that can be registered and watched. Provider-profile decisions, workflow options beyond this helper's plan contract, and finite research judgment belong to the inherited Generic task Skill.

When the workflow advertises self-owned agent execution, delegate the entire handoff to Generic: prepare/inspect requests, perform semantic work, validate each result, apply the mapping, and inspect the durable apply receipt. Resident watched runs and notifications do not supervise `agentRunId` values.

Use live workflow discovery even when a cached catalog entry exists. A cached definition helps selection but cannot establish current execution modes, backend compatibility, permissions, or result schema.

## Plan and submit

Create the deterministic plan from current context:

```sh
scripts/zotero_librarian_service.py workflow plan \
  --workflow <workflow-id> --from-context \
  --output <absolute-plan.json>
```

Inspect `receipt.data.parentItemRefs`, the workflow ID, `defaultConcurrency`, and the file returned in `receipt.data.path`. If the selection is empty, stale, or contains unintended parents, correct the Zotero selection and produce a new plan. Do not hand-edit the file and represent it as service-validated.

After the operator authorizes that exact plan, submit it:

```sh
scripts/zotero_librarian_service.py workflow submit \
  --plan <absolute-plan.json> --allow-submit
```

The explicit flag records current operator authority but cannot replace Zotero-side approval. Preserve every returned run and the count of remaining plan entries. Another pass over remaining entries requires another current instruction; do not treat the original authorization as an indefinite batch grant.

## Provider profiles and concurrency

The resident plan file does not encode a backend provider profile. If the workflow requires backend-owned provider options, use Generic to list/describe the backend profile, validate the provider JSON independently from workflow inputs, and submit through the exact CLI contract that joins them. Connection profile and provider profile are separate concepts.

Resident submission defaults to concurrency one. A higher `--concurrency` launches at most that many plan entries in the current pass and must be explicitly approved after considering backend/provider limits, cost, item independence, and monitoring capacity. Never use a large value to emulate an unattended queue.

Record each launched `workflowRunId` independently. Partial launch does not mean remaining entries failed or were authorized for a later run. If one launch is uncertain, inspect live recent runs before resubmitting that entry.

## Cron and maintenance

Every shipped cron is Zotero-read-only and one-pass. It may update `state.sqlite`, emit attention, and produce `[SILENT]` for no reportable delta. It cannot wait, ask for approval, submit, apply, acknowledge events on assumption, invoke user-selected scripts, or write arbitrary paths.

Workflow-status triage identifies watched runs needing review. Library hygiene currently identifies repeated-title candidates. Synthesis attention reports live ranked entries. These are diagnostics and proposals. Before remediation, invoke the appropriate Generic task, re-read the current objects, explain the effect, and obtain current authority.

Maintenance of Synthesis cache, indexes, sidecar, graph, or metrics follows the Generic Synthesis and CLI contracts. An empty queue or stale local projection is not sufficient reason to modify derived state.

## Interaction and reporting

For a waiting run, inspect its live `skillRunId` and declared actions before reply or connect. Permission IDs are observational in the CLI; approval remains in the scoped Zotero UI. Notification events are acknowledged only after their requested or implied follow-up has actually been handled.

Report attention with its reason, item/run/event identifiers, cache freshness when relevant, and next safe live check. Distinguish a proposal from a launched run, a launched run from a terminal result, and a terminal result from verified Products, artifacts, or Zotero changes. Failed receipts retain the stable code and explain the live re-read needed before retry.
