## 1. Contract Evidence

- [ ] 1.1 Add failing differential fixtures for all sixteen owned operations, including ranking, attention, review, proposal, batch, canonical, and job DTOs
- [ ] 1.2 Add mixed-basis, batch atomicity, Host paging, worker retry, restart, bounds, and deadline fixtures

## 2. Read and Matching Surface

- [ ] 2.1 Implement Reference index, external ranking, attention queue, and review-input compatibility projections
- [ ] 2.2 Implement refresh and advanced-matching jobs over bounded Host pages and native workers with durable proposal/job state

## 3. Review and Canonical Mutation Surface

- [ ] 3.1 Implement single and batch match-proposal actions with the public validation and result contract
- [ ] 3.2 Implement dedicated canonical revision review, merge-request, effective merge, metadata update, and archive ports
- [ ] 3.3 Make repository/canonical commits, receipts, conflicts, and restart recovery coherent and idempotent

## 4. Domain Gate

- [ ] 4.1 Pass the sixteen-operation differential corpus, focused Rust/Core/Stage-1 tests, format/clippy, and cross-language checks
- [ ] 4.2 Promote only proven Reference/Canonical capabilities to the ready roster without enabling production activation
