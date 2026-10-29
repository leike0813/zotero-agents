# Tasks

## 1. Private source and live preparation

- [x] 1.1 Implement read-only metadata/PDF preparation with synthetic SQLite integration tests proving independent attachments, missing-file inventory, trash exclusion, and source preservation.
- [x] 1.2 Integrate fresh-profile import and explicit live mode into the existing runner; verify live inputs never select the original profile/data directory and document invocation.
- [x] 1.3 Verify build preflight, install matching dev content, configure MinerU and OpenCode v2, and confirm the exact requested model through the production probe before submitting a workflow.

## 2. Real happy-path capture

- [x] 2.0 Repair author-list false positives and synchronize Citation relations after reference filtering; verify title, author-list, partial/all rejection, unknown-ID rejection, and stored/forwarded contract behavior.
- [x] 2.0a Preserve referenced source-tree images as stored translation companions on creation and replacement; reproduce unreadable image paths before the fix and verify readable bytes and stable attachment identity afterward.
- [x] 2.1 Run tag-bootstrapper, convert 20 PDFs, analyze five papers, and verify public artifacts and independent tag-regulator behavior; retain reviewed private evidence for each successful step.
- [x] 2.2 Run deep reading with translation and independent translator/explainer; verify language, generated-image readability, and parent ownership.
- [x] 2.3 Create T1 from a seed including two related sources awaiting analysis, create T2 from a Planned Topic, analyze the two deferred sources, verify T1 stale, update T1, and verify fresh public state.
- [x] 2.4 Run remaining curation, ingest, research export, and framing workflows with user-answered or explicitly delegated live decisions; verify public output and retain actual interactions.
- [x] 2.5 Run literature and note export/import round trips against targets requiring restoration; verify structure, assets, and ownership without duplicate generated notes.

## 3. Synthetic offline regression

- [x] 3.1 Materialize de-identified structure contracts and synthetic HTTP/ACP peers only from reviewed successful capture; verify privacy, schema validation, and meaningful peer self-checks.
- [x] 3.2 Complete WF-01 serial production-path assertions, stop-on-first-error behavior, cleanup, health, fixture identity, and Run Manifest evidence; verify offline Zotero 10 execution.
- [x] 3.3 Document source preparation, live approval, capture admission, offline execution, and diagnostic recovery; verify documented commands and matching coverage of all 20 workflows.

## 4. Integration acceptance

- [x] 4.1 Run related Node tests, production builtin request contract tests, targeted lint/format/type checks, and OpenSpec validation; retain actual results.
- [x] 4.2 Run independent offline E2E invocations on Linux Zotero 7, 9, and 10 with current-source sidecar; deliver complete Run Manifests and explicit remaining limitations.

## Current verification and stop point

Live invocation `85baa717-286d-4223-b474-0860d16d4730` stopped at the first
tag-bootstrapper attempt, as required by the successful-evidence admission
policy. The actual host reported Zotero 10.0.5. The fresh profile imported 220
parents, 220 stored PDFs, and four collections; one missing source PDF was
inventoried. Content Package 0.8.10-dev.16 installed, and the OpenCode v2 probe
advertised the exact requested model among 591 models. No model prompt ran.

The buildRequest hook failed with `The Synthesis runtime is unavailable` and
the queue settled `workflow-unit-build-or-execution-failed`; no job/ACP run was
created. The captured registry also classified workflows as `user` despite the
successful official-package installation. These were live-driver integration
findings, not accepted Workflow behavior or a proven product bug.

The user authorized diagnosis and continuation. A real-Rust differential check
isolated the first failure to the separately bundled test's uninitialized
Synthesis client owner. The live driver now uses the existing native composition
with the real discovered connection and selects the official content directory.
The regression check passed without model calls or vocabulary mutation; 18
existing client lifecycle tests and 11 runner helper tests also passed.

Fresh invocation `74f1e53f-cfc7-4a75-87f2-f973b3fac8d9` imported the same source
inventory into a new profile, verified all loaded workflows are official,
installed Content Package 0.8.10-dev.16, and probed the exact requested model.
Its first tag-bootstrapper run succeeded and applied 68 custom vocabulary
entries, retaining five builtins. Validation passed with zero output repair
rounds and the exact requested model. The user clarified that acceptance concerns
business-flow legality, not agent content quality. The temporary rejection over
a tag note's factual accuracy was withdrawn without changing or retrying the
output. Tag bootstrap is accepted as successful business-flow evidence. The
20 MinerU conversions passed with per-step business-flow reviews: each
Markdown attachment belongs to the expected parent, and all 460 local image
references are readable. The first literature-analysis invocation then failed
before its first model prompt: `runtime_dependencies_injection_failed`, with
readiness `runtime_dependency_strategy_unavailable` for `pymupdf4llm`, `jinja2`,
and `jsonschema`. The driver subsequently reported `workflow_capture_no_execution`
because there were no task records, masking the failed ACP run's diagnostic.
The failed run, private input workspace, runtime evidence, and final Run Manifest
are preserved. No dependency installation, retry, later workflow, or successful
fixture admission followed this failure.

Follow-up diagnosis confirmed that the capture bundle had its own uninitialized
runtime command registry: its generated script contained the empty registry but
no startup preflight, while the plugin bundle initialized its separate registry.
An isolated production-probe differential returned the identical unavailable
diagnostic before initialization, then found the installed uv and successfully
ran an offline, no-project Python version probe after initialization, without
installing dependencies. The driver now performs the existing environment,
command, and process-control preflights before import and preserves the detected
command snapshot privately. Final run failures now retain their underlying
diagnostic before the generic no-execution assertion. Full dependency preparation
and a resumed live analysis remain unverified; no workflow retry was performed.

The user then authorized continuation. Capture continuation copies only the
previous stopped test profile/data and carries successful-step references into
a new invocation. Its synthetic isolation test passed. Invocation
`83795b4f-b7d8-4f87-8458-27962ec333fd` was interrupted after an official-content
startup prompt blocked foundation; no model prompt ran. The live test prefs now
select the requested content channel before startup. New invocation
`0bed1cc1-9d67-4927-8cfb-0fa8c37966d1` passed foundation, detected the installed
uv inside real Zotero, completed dependency preparation, and reached the first
literature-analysis model prompt with the exact requested model. That analysis
step succeeded with valid output, successful apply, and zero output repair;
public artifact reads confirmed all four standard artifacts available. Its
automatic tag-regulator step then failed during apply with
`workflow editor dialog is unavailable`. Capture stopped before the second
paper and retained the separate substep outcomes, generated files, final Run
Manifest, and stopped test profile/data. The composed literature-analysis
workflow is not accepted as successful evidence; its successful analysis
substep does not conceal the failed downstream apply. No retry followed.

Dialog diagnosis found that the invocation used the runner's default native
headless mode, while the immediate exception occurred before window creation:
the capture scope lacked the initialized plugin's Toolkit Dialog constructor.
A constructor-level differential reproduced the same failure with either
headless setting and reached dialog construction after supplying Toolkit.
The driver now follows the existing submission-form E2E binding/restoration of
the real addon and Toolkit and checks Dialog availability before any workflow.
The documented live invocation explicitly selects visible mode. A real visible
dialog and the failed tag-regulator apply have not been retried or validated.

Visible continuation `66420a4f-5c34-4288-9ba9-85c6ebff78e5` verified the
real Toolkit editor opens, displays its production ten-second countdown, and
closes after automatic staging. Independent tag-regulator completed valid
output and successful apply with zero repair rounds and the requested model.
Its private business review accepts that independent step without revising
the earlier failed composition. Public reads subsequently confirmed the first
analysis's four available artifacts still map to four readable notes owned by
the expected parent.

The second paper's literature-analysis then failed during apply with
`citation analysis references are stale`. Capture stopped, the Run Manifest
is `aborted`, and its original workspace, stopped test profile/data, and final
manifest are preserved privately. Its result is not successful fixture evidence;
no later paper was submitted. The copied database confirms zero child notes
for that paper. A downstream regulator record was initialized by the production
sequence, but no regulator model prompt ran before capture shutdown.

A read-only reproduction using the production reference filter and cross-artifact
validator found that the raw References/Citation pair is valid. The quality gate
misclassifies one normal title as `author_only_title`, reducing 30 references
to 29. The unchanged Citation artifact then has an unknown reference in an item
and a timeline bucket. This is an apply-layer filtering/consistency defect,
not evidence of a Linux sidecar lifecycle failure or poor generated prose.
No production fix, output rewrite, retry, or successful fixture admission was
performed after this failure. The remaining capture and offline matrix are pending.

Both failed live Run Manifests are `aborted`: foundation passed, WF-01 failed. An earlier
preparation-only invocation, `ac7a09a7-55e7-4423-86c3-07c6a4a98fec`, was stopped
before workflow calls to reload the capture driver and remains `incomplete`.
No correct-output fixture has been admitted. Final WF lifecycle cleanup and
typed completion evidence, remaining workflow assertions, synthetic peers, and
the offline matrix remain implementation work.

Checks completed for the current partial implementation: three new source and
staging tests, eleven related runner tests, and 53 production request-contract
tests passed. Build preflight, plugin build, help-doc verification, TypeScript,
targeted ESLint/Prettier, and strict OpenSpec validation passed. These checks do
not substitute for the failed live capture or missing offline acceptance.

Continuation added a synthetic MinerU HTTP peer with four passing focused tests;
it is not yet wired into the full offline WF family. Four source/staging tests,
eleven related runner tests, targeted ESLint/Prettier, root TypeScript, and
OpenSpec checks passed. A broader tooling-runtime shard run reported one failure
in the existing background-refresh governance test's source-text assertion;
that separate failure has not been diagnosed or fixed here.

The MinerU routes now share the existing E2E HTTP peer. The integration test
first reproduced its missing route (404), then passed after wiring the handler;
all five MinerU tests and eight existing SkillRunner peer-control tests passed.
Targeted formatting and lint checks passed. This verifies peer plumbing only,
not offline production-workflow acceptance.

Reviewed tag-bootstrapper and independent tag-regulator shapes now have wholly
synthetic output JSON. The initial ACP peer handles these two skills, echoes
the current regulator input metadata/tags, and rejects unreviewed skills rather
than manufacturing success. Three process-level contract tests passed after
first failing for the missing peer. Full production apply and offline WF-01
remain unverified. Root TypeScript and strict OpenSpec validation passed.

The user authorized the reference-filter repair and a fresh analysis attempt.
Author detection now requires an explicit initialized-name structure or a
comma/semicolon-separated list of full names. Filtering records only the rejected
source IDs and removes those IDs from Citation items and timeline buckets;
unrelated unknown IDs still fail atomically. Synthetic tests reproduced both
defects before implementation. The analysis suite passed 52 tests (eight host-only
cases pending in Node), including its real-Rust sidecar apply case; all 53 builtin
producer contract tests passed. The preserved failed pair now retains all 30
references and passes cross-artifact validation with the corrected filter.
No failed evidence was rewritten. Root TypeScript, targeted test lint/format,
and production MJS syntax checks passed.

The required `check:content-package-release -- --current-branch` now fails
because these source fixes differ from the published dev package. Plugin build
and the fresh live attempt have not run while that preflight condition remains
unresolved; no version bump, commit, push, or remote publication was authorized.

The user subsequently authorized a one-invocation isolated local-content test
exception. Capture-07 restores the stopped test snapshot into a fresh scaffold,
loads current source through the existing dev-local content root, verifies that
source for every workflow, and records its directory/content identity privately.
All other preflight evidence remains required; no release, version change, or
remote write is authorized. The failed capture-06 verdict remains unchanged.

Capture-07 invocation `7d12fdd3-fe1b-488f-a086-d8cff9401d15` passed foundation
on Zotero 10.0.5 with current-source Rust sidecar and verified all 42 catalog
entries use dev-local source. The corrected second-paper analysis and its
automatic tag-regulator both completed valid output and successful apply with
zero repair rounds and the requested model. The actual editor opened and closed;
public reads confirmed four available artifacts and four readable child notes
under the expected parent. Its successful workspace and review are private.
The third paper is now running. Source inventory also corrected the documented
non-debug workflow count to 20; runtime coverage already uses the debug flag.

The synthetic analysis artifact templates now pass the canonical References,
Citation, Score, and cross-artifact validators. The ACP peer writes these five
synthetic files into the declared run workspace and returns their runtime paths;
its process-level test first failed for unsupported analysis and then for an
incorrect nested-manifest output directory before passing. All four ACP peer
tests pass, including refusal of unreviewed skills. This is external peer contract
evidence; offline production WF-01 remains pending.

The third and fourth papers' full analysis/regulation compositions also passed
public artifact and parent-ownership review. The fourth analysis used one
supported output repair round and then completed valid output and successful
apply; that repair is recorded rather than classified as a business failure.
The fifth paper is running. The topic scenario now preserves the original
additional-paper sequence: T1 includes two related deferred sources with missing
analysis artifacts; their later first analysis must change its public freshness.

The fifth analysis and its automatic regulation completed with zero repair;
the final public read confirms all twenty standard artifacts across the five
parents available. Each parent's four notes passed ownership/readability review.
All per-step raw workspaces remain private. Before entering longer translation
and synthesis sequences, the capture observation budget is raised from thirty to
ninety active minutes; the actual fourth analysis/regulation composition took
almost thirty minutes. A planned operator checkpoint will preserve the successful
profile and incomplete invocation evidence before reloading that driver change.
Backend and dependency-preparation budgets remain unchanged.

The planned operator restart stopped only the isolated Zotero process after
step 26's accepted result and before another command. Capture-07's final
manifest is `incomplete` (one foundation pass, zero failures, WF-01 incomplete),
not a completed suite or business failure. Its stopped profile/data and final
manifest are preserved. Capture-08 continues that checkpoint using byte-identical
authorized workflow fixes and the longer observer budget; its first command
requests deep reading of the English source in Chinese fast mode.

Capture-08 invocation `be82b7b7-9c0d-4039-879e-c5b7451bdb5d` passed
foundation and reached the actual translator-to-deep-reading sequence. Translation
finished with valid output and successful apply after one supported repair;
its English-to-Chinese alignment contains 159 blocks. The downstream request
received the successful translator status and both output paths.

Public resource review then found a business failure: the stored translated
Markdown references 13 local images, but its attachment directory contains only
Markdown and alignment JSON. All 13 images remain readable in the original
source attachment directory. A synthetic invocation of the production
`materializeTranslatorArtifactTexts` function reproduces the omission: the stored
attachment descriptor includes alignment JSON but no referenced image companion.
This finding concerns attachment packaging, not generated prose or demonstrated
Linux sidecar lifecycle failure.

Capture stopped immediately while downstream deep reading was running, before
another workflow command. Its final runner manifest is `incomplete` (foundation
passed, WF-01 interrupted), while the separate private business review explicitly
records failure; neither is a successful fixture. The quiescent test profile,
data, workspace, public attachment response, and failure review are preserved
under capture-08. No translation/deep-reading fixture was admitted, no automatic
retry followed, and no production repair for this new defect has been applied.

The user authorized diagnosis, repair, and continuation. The existing translator
apply test now reproduces the missing stored image, then verifies creation and
replacement using the production apply seam. The translator reuses the existing
source-tree Markdown image resolver to include referenced local images in the
stored attachment companion set, preserving Markdown/alignment relative paths.
All 18 translator tests and 98 producer-contract/portable-bundle tests passed;
root TypeScript passed. All native and generated-content preflight checks passed.
Published dev content still differs from the local fixes; the previously
authorized isolated local-content exception applies to the continuing capture.
The failed capture-08 evidence remains unchanged. The new attempt restores the
successful capture-07 checkpoint so translation actually executes again.

Capture-09 invocation `5ea21cff-bd4f-44a3-962c-b668a7d7daa1` passed
foundation on Zotero 10.0.5 with the current-source Rust sidecar. The rerun
translator completed valid output and successful apply after one supported
repair. Public attachment reads and local file checks confirm all 13 image
references readable inside the new stored translation attachment, with correct
parent ownership and 200 English-to-Chinese alignment blocks. The downstream
deep-reading request received the successful status and both translated paths;
the composed deep-reading workflow is still running and is not yet admitted.

The live driver now supports declared input/output resources through the
production Host Bridge submit seam for import/export capture; four existing
resource/approval/download contract tests, root TypeScript, targeted ESLint,
and formatting passed. This branch is not loaded in the current capture bundle
until its next planned restart. A wholly synthetic source input tree contains
20 English papers/PDFs and four collections; it supplies inputs only and does
not establish any successful expected behavior or offline acceptance.

Capture-09 step 27 subsequently completed the full deep-reading composition.
Both runs ended with valid output and successful apply using the requested
model; deep reading required zero repair. Public attachment reads confirm one
readable HTML child under the correct parent, containing readable embedded
images and no external resource dependency. Its workspace and business review
are preserved privately. Step 28's independent translation also completed valid
output and successful apply after one repair; all 30 local image references and
its 136-block English-to-Chinese alignment are readable under the expected
parent.

Step 29 literature-explainer reached a valid pending user interaction asking
whether to continue questions, preview a learning note, or end without a note.
The user question is pending; no reply, final note, or success admission has
been fabricated. Translation/deep-reading synthetic output support now passes
the existing process-level ACP peer checks (six cases total); its alignment
uses the reviewed fast-mode empty sentence-pair shape. Complete offline WF-01
and the platform matrix remain pending.

The user explicitly delegated subsequent capture interactions to the operator.
The explainer's learning-note preview branch is selected within that delegation;
its preview will be reviewed before confirming file creation. Live questions and
actual replies remain private evidence, and business-failure admission rules
remain unchanged.

The delegated explainer interaction completed preview and explicit confirmation.
Its final output and apply succeeded with zero repair. Public note reads show
exactly one new readable conversation note under the selected parent, with the
four previous analysis notes preserved. The final Markdown file is readable;
four non-fatal warnings are recorded without judging prose quality. Step 30
now runs ad-hoc T1 creation from a seed explicitly covering the five analyzed
papers and two deferred papers. Public baseline reads confirm all eight analysis
artifact statuses for those two deferred papers are missing.

Step 30's three create substeps subsequently completed valid output and successful
apply with zero repair and the requested model. Public full context and report
reads confirm one fresh T1 with all seven resolved sources, including the two
deferred sources and their explicit missing-material diagnostics. The report,
workspace, and accepted business review are private. Step 31 now runs the Topic
Planner; its first output entered supported repair because its optional coverage
locator was interpreted as a flat artifact manifest. No terminal planner result,
Planned Topic creation, or later workflow has been admitted yet.

Default and explicit offline staging now copy only the synthetic twenty-paper
input tree into the existing runner's isolated data directory. Three focused
staging tests pass, including independent PDF bytes, preservation of unrelated
test data/profile files, and ignoring live-source/continuation settings in offline
mode. Synthetic Topic sections and sidecars pass both TypeScript and Rust
structured-artifact validation. These checks do not establish offline Workflow
execution or expected Topic lifecycle behavior.

Step 31 completed valid output and successful apply after one supported repair.
The repaired output uses a flat coverage wrapper pointing to the full coverage
JSON. Public inventory contains all 28 new Planned Topics; the plan declares 43
relations and its coverage records all 225 current items. The chosen Planned
Topic's public semantic context has an active planned lifecycle, definition,
revision, and stored resolver. Its workspace and accepted review are private.
Step 32 now creates a synthesis from that exact Planned Topic identity; its
final output and materialized public state remain pending.

Step 32 completed all three substeps with valid output, successful apply, and
zero repair. Public full context confirms the chosen Planned Topic became
materialized under the same topic ID with an unchanged stored resolver and a
fresh dependency baseline; its report is readable. Step 33 now performs the
first analysis of the first deferred source. T1 remains fresh immediately before
that analysis. Offline backend wiring and the reviewed initial serial chain are
in progress and remain unregistered until full coverage and lifecycle checks are
implemented. Existing runner infrastructure plus staging checks pass 79 cases
(three platform-specific cases pending); root TypeScript passes.

Steps 33 and 34 completed both deferred analyses and automatic tag regulation
with valid output, successful apply, zero repair, and the requested model.
Each public read confirms four available artifacts and four readable owned notes.
T1 is stale for `topic_dependencies_changed`; source materials moved from partial
to complete and its missing-material list is empty. Step 35 now runs the T1
update; its final apply and fresh state are pending.

The synthetic ACP peer now supports reviewed seed/planned create handoffs and a
bounded Topic Planner, with eleven passing process-level checks. Its default
public reader was also exercised read-only against the actual isolated host:
resolver returned seven sources, the downloaded artifact JSON returned four
payload hashes, and planning-context download returned the full context. The
reader consumes full artifact delivery rather than the hashless inline summary.
No topic mutation or model prompt was made by that reader check. Full offline
Workflow apply and cleanup remain pending.

Step 35 completed its three update substeps with valid output, successful apply,
zero repair, and the requested model. T1 is fresh under the same identity, retains
the original seven sources, and uses the exact prior public audit hashes for
`update_full`. Its resolver legally adds five related sources; those new sources
lack analysis, so availability is partial while freshness is fresh. An operator
assertion incorrectly requiring complete availability was corrected, with the
original assertion failure and explanation retained privately. No workflow was
retried or output changed. The public report and accepted update workspace are
private. Step 36 subsequently completed the local tag audit.

Step 36's public workflow state and runtime apply settlement both report success.
A read-only inspection of the isolated sidecar repository confirms the audit was
promoted, covers all 225 items, and has matching snapshot and active-regulation
counts. Only structural audit behavior is admitted; its content-dependent
regulation count is not an offline expectation.

Capture stopped during step 37, Collection Collector. The original runtime sent
`cursor: "0"` on the first library page, received `invalid_library_cursor`, and
misreported it as `target_collection_not_found`. The agent then modified the
repository runtime and a runtime test, used `git checkout --` during its own
test loop, and continued after those unreviewed changes. It did not reach a
successful final apply before the operator stopped the isolated host. No later
workflow was submitted and this result is not a successful fixture.

Both unreviewed edits, the original canceled result, complete transcript,
workspace, quiescent test data/profile, and explicit failed business review are
preserved privately. The invocation's final Run Manifest is `incomplete`
(foundation passed; WF-01 interrupted), not a completed suite. The two agent
edits remain visible and unreviewed in the working tree; they have not been
silently adopted or reverted. A read-only reproduction using HEAD confirms the
baseline's initial cursor is invalid and that its Topic context parser returns
zero source refs for real current contexts containing four and twelve sources.
Further real calls require correcting these runtime contracts and preventing the
capture agent from taking repository development actions.

The user authorized repair and continuation. The Collection Collector runtime
now omits the initial cursor, passes opaque continuation unchanged, and rejects
missing or repeated continuation. Topic source membership is read from the
flat contract's `resolved_paper_set.papers`; resolver selectors do not count as
resolved sources. Only a structured `collection_not_found` response becomes
target-collection cancellation; other inventory errors retain a failed command
and resumable stage. The Skill explicitly requires preserving runtime failures
without repository edits or runtime-state reconstruction.

Regression checks reproduce the original cursor/parser failures from HEAD.
The strengthened gate CLI tests first failed for selector leakage and swallowed
cursor failure, then all five passed after repair. The production builtin
request contract suite passed 53 cases. Native runtime and generated-content
preflight checks passed; the published dev content check reports the expected
local-content drift under the previously authorized isolated-test exception.
Real retry and later workflow capture remain pending.

Capture-10 resumed the 36 accepted steps in a new isolated invocation. Step 37
Collection Collector completed with valid output, successful apply, zero repair,
and the requested model. Public collection reads verify all five original
members remain and thirteen selected members were added. Its assessment packets
include resolved Topic sources. The run workspace and public membership review
are preserved privately. Step 38 metadata curation is now submitted.

Step 38 metadata curation completed with valid output, successful apply, zero
repair, and the requested model. Public before/after reads preserve the same
parent identity and confirm sixteen returned metadata fields are present after
apply. Step 39 now runs targeted literature search/ingest for a source absent
from the temporary library, under the user's delegated interaction authority.

Step 39 stopped at the first literature-ingest mutation response failure. The
CLI returned `bridge_response_failed`, `Resource temporarily unavailable (os
error 11)`, with unknown state change and handle consumption. Public operation
receipt reads returned `state: unavailable`. Later transcript review found one
agent-issued retry with the same operation ID before operator shutdown; both
attempts timed out. No later workflow was submitted. Both actual delegated decisions (search plan and sole candidate)
remain private. The operator preserved the original failure and unavailable
receipt before terminating the isolated ACP child; that termination is not the
root failure. The test then stopped normally with WF-01 failed and foundation
passed. The accepted checkpoint remains 38 completed steps, with step 39 next.
The failed workspace, quiescent test data/profile, and final Run Manifest are
preserved under capture-10. This invocation contributes no failed golden output.
Host mutation outcome and root cause require diagnosis before continuation.

Diagnosis confirmed the driver omitted Host `pendingPermission` while handling
only `pendingInteraction`. The captured request waited for write approval before
canonical execution; neither a new source item nor a canonical mutation record
exists in the stopped snapshot. A no-write local endpoint reproduced the CLI's
30-second socket timeout as Linux `os error 11`. An additional `operation get`
schema mismatch rejected the Host's actual `runtimeInstanceId` field.

The user authorized repair and continuation. The driver now records and answers
Host approvals through the initialized plugin's public Assistant Workspace
action, preserving the actual queue owner across separately bundled tests.
Approval waits pause the capture budget. CLI approved capabilities allow the
shared five-minute approval budget plus their request budget; the Host imports
that same policy. Operation receipts now satisfy the CLI schema. Regression
tests failed first and passed after repair. All 161 Rust CLI tests, 68 Host/ACP
tests, and 58 packaging tests pass (one existing packaging case pending).
Generated command references add only the actual receipt field, retain all
baseline instruction text, and pass package checks. Current-source CLI is
built and injected for isolated capture; governed CLI binaries and published
dev content remain stale and are not claimed as release-ready.

The collector regression fixture was consolidated into its existing inventory
scenario to remove the duplicate happy-path setup. Its final four gate CLI
tests pass, including two-page member exclusion, actual Topic-source recall,
selector exclusion, typed missing-collection cancellation, and preservation of
other runtime errors. Production source stayed byte-identical throughout the
live retry. Related Host contract checks pass ten cases; TypeScript, targeted
ESLint/format checks, and strict OpenSpec validation also pass. No Linux
7/9 offline or Windows acceptance is claimed for this interrupted capture.

Capture-11 exposed an incorrect driver ownership assumption in that repair:
the ACP execution path starts the test bundle's Host server and queues the
permission in that same bundle. The separately initialized plugin sidebar
acknowledged the action without consuming that queue. The CLI correctly waited
beyond thirty seconds. The operator preserved the pending approval and stopped
the exact isolated ACP child before the five-minute approval timeout. No later
workflow ran; the stopped database contains zero DEIM title rows. Cancellation
is not the root cause, and this result is not admitted as a successful fixture.
Quiescent data/profile and the aborted Run Manifest remain private.

The driver now resolves through its own production permission queue, first
requiring its Host projection to be pending and then verifying both approved
projection and consumed queue entry. The existing module-boundary test now
exercises a real scoped Host approval rather than an artificial resolver.

Capture-12 verified the corrected owner: the pending Host projection became
approved and the run queue consumed it before the canonical ingest committed.
Step 39 completed with valid output, successful apply, zero repair, and the
requested model. Public reads verify one created parent, target collection
membership, and governed task tags. Optional PDF enrichment failed while the
landing attachment succeeded; the existing ingestion contract and regression
test explicitly preserve metadata-only success in this case. This evidence
establishes successful ingest and truthful `need-fulltext` state, not PDF import
success, and does not turn the PDF failure into a golden expectation. The
explicit single-source input required no additional conversation turn in this
run. Step 40 now exports a Research Bundle.

Two curation output fixtures are synthetic and pass their production schemas.
The existing ACP peer now binds Collector identities and returns curator
metadata; fourteen peer checks pass. The unregistered offline serial branch
includes membership preservation and metadata identity/write checks. Root
TypeScript, targeted lint/format, and strict OpenSpec validation pass; complete
offline coverage and actual Zotero execution remain pending.

Steps 40 and 41 completed with valid output, successful apply, zero repair,
and the requested model. Research Bundle public reads cover both asset pages;
all 133 assets are available and their downloaded sizes match the registered
sizes. Its manifest is completed; declared graph-metric and bibliography
fallback warnings do not become fixed expectations. Framing registered the
expected Product kind and eight available, readable assets. Both workspaces
and public download evidence are private. Model-generated prose, selection
counts, and whether fully specified input needs another conversational turn
are outside the golden boundary.

Capture-12 stopped during step 42 after the production literature export
returned a downloadable ZIP. The driver incorrectly passed a relative output
name to native `PathUtils.filename`, which requires an absolute path. The
failed invocation contributes no step-42 golden result. Its export, stopped
data/profile, and aborted Run Manifest are preserved. The driver now joins the
name to the absolute evidence directory before checking its basename. Capture
continues from the read-only export; the 41 accepted steps are not replayed.

Capture-13 verified the filename repair. Step 42 completed; its two-paper ZIP
has 78 declared files with matching sizes and hashes, both PDFs, owned notes,
all four payload types per source, Markdown images, and deep-reading assets.
The successful export is admitted; bibliography fallback remains a supported
warning rather than a fixed expected value.

Capture stopped at step 43's business review: direct import returned and the
pass-through task was succeeded, but paged public reads and the stopped native
database both remain at 230 regular parents, with zero new identities. No later
workflow was submitted. The original checkpoint is preserved; the reviewed
checkpoint admits only steps through 42 and keeps import as step 43. The stopped
data/profile and incomplete Run Manifest are private; the failed import is not
a golden result.

A bounded reproduction using the production non-interactive Host context and
the already verified exported manifest reaches a deterministic target error:
the import workflow calls `context.getCurrentView`, which that Host explicitly
forbids. The manifest advertises non-interactive support, but its importer still
requires the current interactive view to resolve the destination library.
Source tracing confirms that apply is reached and its failure becomes a failed
unit outcome. Direct submission discards the resolved completion summary and
returns raw job handles instead, hiding that apply failure. The direct branch
also does not call the terminal callback that owns leaf/resource cleanup.
The authorized repair adds explicit destination library/collection options to
bundle import, preserves interactive current-view behavior, and rejects a
missing or inconsistent non-interactive destination. Direct Host submission now
propagates failed apply summaries as `workflow_submit_failed` and releases its
resources and upload leases on both success and failure. The production
non-interactive target tests and direct HTTP/cleanup regressions failed before
repair; the related workflow, Host and builtin request suites then passed 175
cases, followed by six destination boundary cases. TypeScript, targeted ESLint
and strict OpenSpec validation passed.

Capture-14 accepted steps 43 and 44: public inventory confirms two new independent
parents, four managed notes per parent, six downloadable direct attachments,
and readable Markdown image companions. The note ZIP contains all four standard
artifact files. A private operator-derived note-free bundle omitted mandatory
README/index entries and was correctly rejected before mutation at step 45.
That preparation failure remains excluded. The fixed derived bundle passed the
production manifest validator before retry.

Capture-15 accepted step 45's fresh parent with zero notes, then step 46 restored
exactly four readable managed note kinds through the real import-notes resource
slots. Public reads verify ownership and unchanged original/complete-clone
notes. This completes successful business capture for all 20 non-debug workflow
kinds. Optional representative-image restoration is not claimed for the
non-interactive note-file slots. The live test passed but its Run Manifest is
incomplete because this driver had not published a family-result record;
offline acceptance must verify that record and cleanup/health explicitly.

Generated workflow catalogs now include the two destination parameters.
Host surface and 156-file Chinese review-mirror checks pass. Baseline
`ebb8a05301f9c9eb40455d372b662d16f42e04ce` has no authorized instruction
deletions; unmapped, downgraded, unauthorized dropped and intra-package duplicate
counts are zero. Existing advisory depth warnings are accepted with complete
usage/evidence/recovery preserved. Governed CLI and published dev content remain
stale under the user-authorized isolated local-source exception; no release,
push, version change or freshness claim was made.

Offline WF-01 now runs all 20 workflows through production execution and apply.
The registered synthetic contract verifies 20 conversions, seven analyzed
parents, language-changing translation, owned readable notes/attachments,
planned-topic materialization, fresh/stale/fresh updates, collection and metadata
changes, canonical ingest, readable Product assets, independent bundle clones,
and four managed note kinds restored into an empty target. ACP sessions close
in family cleanup; durable business results remain declared carry-over in the
disposable profile. The family publishes its actual lifecycle and health result
so a Mocha pass alone cannot produce an accepted receipt.

The related workflow/Host/producer/source/capture/MinerU Node suite passes 187
cases with the explicit 15-second test budget. An earlier run hit Mocha's
default two-second timeout in the existing bundle round-trip case; no behavior
or assertion was changed to pass it. ACP peer checks pass 14 cases, ingest peer
checks pass three, and research/framing peer checks pass two. Root TypeScript,
targeted ESLint, fixture/changed-file Prettier, diff whitespace, and strict
OpenSpec validation pass. Fixtures were checked for captured source identities,
titles and local paths; only synthetic content and structural contracts remain.

Independent Linux invocations use the current-source sidecar and each report
two passed cases (foundation and WF-01), zero failed/skipped/incomplete cases,
`terminalState: complete`, and passed WF cleanup/health:

| Actual Zotero version | Run Manifest ID |
| --- | --- |
| 7.0.32 | `6375125e-f6c1-4111-9bc0-585967eac979` |
| 9.0.6 | `e880e534-250e-4530-b254-a6f42c624ca0` |
| 10.0.5 | `120ddc3e-ab45-4344-b1e3-2060ad30ec05` |

Receipts are under `artifacts/test-diagnostics/system-e2e/<id>/run-manifest.json`.
Each sibling `workflow-contract/` preserves the fixture identity and successful
business contract; all three match the committed synthetic contract. The local
Zotero 10 installation directory is named 10.0.2 but the actual host reports
10.0.5. Windows acceptance and governed CLI/content publication were not run.
