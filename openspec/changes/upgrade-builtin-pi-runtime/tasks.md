# Tasks

## 1. Matched SDK and browser setup

- [x] 1.1 Pin core/ai 1.0.0 and update the lock; verify actual installed/locked versions match and keep OMP unchanged.
- [x] 1.2 Retain the exact browser guard and verify the new import graph with focused guard tests and the production bundle.

## 2. Prepared runtime requests

- [x] 2.1 Add a failing public Runtime regression for prepared instruction/tool replacement, implement prepareRequest normalization and verify first/tool-continuation requests and executable tools agree.
- [x] 2.2 Replace stop-after-turn with finishTurn; verify waits, unknown effects, LoopGuard rejection, cancellation and physical settlement through existing Runtime/owner tests.
- [x] 2.3 Adapt existing SDK test ports to normalized transcript input; verify no SDK state/system messages enter project records and document the request adapter in this design.

## 3. Provider and preparation

- [x] 3.1 Adapt direct Provider calls to normalized transcript input; verify actual HTTP instructions/tools, selected authorization and existing failure/abort behavior in the Provider suite.
- [x] 3.2 Add an estimator behavior regression, move estimation to Pi AI and account for complete prompt/tools/messages; verify increasing descriptions/arguments and existing budget/compaction CAS behavior.
- [x] 3.3 Share manifest-derived runtime/adapter/estimator versions; verify frozen selections and new preparation records while retaining historical facts.

## 4. Integration and admission evidence

- [x] 4.1 Run applicable Node suites, lint, production build/type checks and browser guard; record commands/results and change-specific limitations in verification.md and the acceptance runbook.
- [x] 4.2 Run actual SDK/runtime/preparation/Provider cases on Linux Zotero 7.0.32, 9.0.6 and 10.0.1 using existing isolated runners; retain observed versions and results.
- [ ] 4.3 Run the corresponding Windows three-version admission and retain nonblocking macOS visibility; missing evidence remains pending and cannot complete the change.
- [x] 4.4 Run existing full PI owner integration and browser/bundle budget evidence for this stage; preserve failures and distinguish these results from C20 clean final-candidate acceptance.
