## Context

The automated fixture currently produces one `acp-active` record. Its R1, R2,
and buffered-write workload is reusable, but the R3 helper hard-codes ACP Skills
as the active tab. Real-host guidance already distinguishes `closed`,
`open-inactive`, and `acp-active`, so the automated evidence lacks two matching
control states.

## Goals / Non-Goals

**Goals:**

- Make surface state an explicit fixture input and single source of truth for
  metadata, scenario identity, and R3 host state.
- Produce three independently inspectable JSON records and one concise matrix
  report.
- Compare two complete, sequential, reset-isolated matrices before writing.
- Lock `closed` R3 to zero and preserve production R3 code for open states.

**Non-Goals:**

- Change the baseline-record schema or real-host capture controller.
- Simulate a closed Workspace by calling a publication function with a fake
  `closed` label.
- Compare mock duration values or claim host timing equivalence.

## Decisions

### Closed means no R3 call

The closed scenario skips the Assistant Workspace publication adapter. This is
the only faithful representation of a Workspace that does not exist; adding a
synthetic closed label to the production publication function would create a
path that runtime code cannot take.

### Open states share one R3 helper

The R3 helper accepts `open-inactive` or `acp-active` and maps them only to the
fake host's active tab. Both states call the same private
prepare/signature/post pipeline through the existing narrow adapter. No metric
is recorded directly by the fixture.

### The matrix owns reset isolation

A matrix runner executes the fixed ordered surface list sequentially and resets
all singleton stores after every scenario. The recording script compares two
serialized arrays of records. This avoids concurrent mutation and prevents one
surface's completed profiles, selected run, or Host Bridge state from entering
another record.

### Surface-specific JSON plus consolidated Markdown

The output directory contains one JSON per surface and a single Markdown report
with a summary and metric detail section for each. The old unsuffixed JSON is
removed so there is only one current automated baseline layout.

## Risks / Trade-offs

- **Three runs increase test time** → reuse the same bounded 1,000-update fixture
  and keep matrix execution sequential and deterministic.
- **R1/R2 data is repeated** → retain it in every record so each surface record
  is independently comparable and uses the unchanged v1 DTO.
- **Inactive publication behavior could drift** → keep the active-tab difference
  in the fake host only and call the same production adapter.
