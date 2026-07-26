## 1. Contract-first coverage

- [x] 1.1 Extend Core 210 with stable Rust Tag typed-boundary and parity corpus expectations.
- [x] 1.2 Extend Core 211 with stable Rust Concept typed-boundary and parity corpus expectations.
- [x] 1.3 Extend Core 212 with stable Rust Topic Graph typed-boundary and parity corpus expectations.

## 2. Typed repository

- [x] 2.1 Add typed Tag records, bounded reads, aggregate/staged/effect/audit transactions, and basis-guarded index promotion.
- [x] 2.2 Add typed Concept records, complete aggregate CAS replacement, and manifest-guarded index promotion.
- [x] 2.3 Add typed Topic Graph records, complete aggregate CAS replacement, and manifest-guarded index promotion.
- [x] 2.4 Add repository rollback, stale-basis, and reopen tests without changing schema or indexes.

## 3. Typed applications

- [x] 3.1 Implement Tag Vocabulary DTOs, policy, compute/Host/resolver ports, promotion receipts, admission, cancellation, and drain.
- [x] 3.2 Implement Concept KB DTOs, proposal/review policy, index/query ports, CAS lifecycle, cancellation, and drain.
- [x] 3.3 Implement Topic Graph DTOs, relation/review/deletion policy, index port, CAS lifecycle, cancellation, and drain.
- [x] 3.4 Export the three modules through the Rust façade and verify no generic dispatch or production capability is introduced.

## 4. Differential evidence

- [x] 4.1 Add the immutable `synthesis-tag-concept-topic-graph-application-parity-v1` corpus with fixed clocks, IDs, results, and faults.
- [x] 4.2 Add the Rust development-only driver and Node checker using physically isolated roots and all-51-table stable comparisons.
- [x] 4.3 Extend Core 218, package scripts, and the five-target candidate workflow so the checker runs before smoke and audits untouched canonical/downstream state.

## 5. Governance and verification

- [x] 5.1 Update migration documentation, run Rust/Node/build/package/OpenSpec gates, verify the implementation against artifacts, and leave the completed Change active.
