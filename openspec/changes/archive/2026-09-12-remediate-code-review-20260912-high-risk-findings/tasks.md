## 1. Host Access trust boundary

- [x] 1.1 Add public-seam tests for header-first authentication, route body limits, and connection capacity; implement two-phase request reading and verify tests 181, 106, and 182 pass
- [x] 1.2 Add repeated-invalid-token and rotation tests; cache encrypted master-token decryption by current material and verify test 106 passes
- [x] 1.3 Add structured Broker failure projection tests; preserve MCP code, retryability, and details and verify test 101 passes

## 2. Bounded files and generated content

- [x] 2.1 Add hostile archive tests; reuse workflow archive limits in ZipBundleReader and verify workflow-control tests pass
- [x] 2.2 Add output-contract containment tests; reject artifact sources outside the run directory and verify the tooling contract test passes
- [x] 2.3 Add one-line display-math, URL sanitizer, and generated-package parity tests; fix canonical sources, regenerate the package, and verify tests 46 and 157 pass

## 3. ACP and Assistant lifecycle

- [x] 3.1 Add transport timeout settlement tests; consolidate timer cleanup and verify test 98 passes
- [x] 3.2 Add permission teardown tests for ACP and embedded MCP; settle pending requests on close/final unsubscribe and verify test 100 passes
- [x] 3.3 Add an in-flight tail publication test; make flush drain newly queued lanes and verify tests 184 and 192 pass

## 4. Mutation correctness and recovery

- [x] 4.1 Add multi-target stale-observation tests; refresh only affected mutation entities and verify test 102 passes
- [x] 4.2 Add interrupted stored-replacement recovery tests; journal and recover swaps before Host service admission and verify the native mutation and Broker paths

## 5. Synthesis storage and performance

- [x] 5.1 Add a large deterministic durable-bundle case; replace copy-on-append grouping and verify synthesis contract tests pass
- [x] 5.2 Add production owner setup-failure tests; clean failed endpoint resources while retaining explicit recovery and verify test 228 passes
- [x] 5.3 Add cross-language collision and migration fixtures; implement Topic path v2, repository foundation v6, canonical-root startup migration, and verify TypeScript and Rust Synthesis tests pass
- [x] 5.4 Update Synthesis persistence documentation for Topic path v2 and explicit migration, and verify documented identities match both implementations

## 6. Review closure

- [x] 6.1 Validate the OpenSpec change strictly and run the minimal relevant type, lint, and test gates
- [x] 6.2 Append the complete reviewed/false-positive/fixed disposition and verification evidence to the original code-review report
