## 1. Regression Coverage

- [x] 1.1 Extend the Assistant UI smoke suite with ACP Skills and SkillRunner token N → N+1 cases that reuse reply DOM, preserve managed-region identity, and dispatch only the latest token with typed text.
- [x] 1.2 Extend the SkillRunner workspace snapshot harness with reusable temporary detach/reattach controls that retain one runtime and capture.
- [x] 1.3 Add same-owner reattach and A→B→A transcript tests covering first-reactivation history convergence, monotonic revision, unique order, and continuous cursor progression.

## 2. Runtime Fixes

- [x] 2.1 Introduce live reply action state in the shared panel renderer and make the stable listener read the current validated payload without changing structural signatures.
- [x] 2.2 Split temporary SkillRunner host detach from complete runtime teardown and reserve revision/cache reset for shutdown, test reset, and true destruction.

## 3. Documentation

- [x] 3.1 Update the Assistant sidebar panel UI SSOT with live action-payload and temporary-detach publication-clock invariants.

## 4. Verification

- [x] 4.1 Run the targeted 71, 97, 107 reply/recovery tests and suite 190.
- [x] 4.2 Run TypeScript, targeted ESLint, Prettier, and `git diff --check` verification.
- [x] 4.3 Run SSOT, localization, help-doc governance, and strict OpenSpec validation.
