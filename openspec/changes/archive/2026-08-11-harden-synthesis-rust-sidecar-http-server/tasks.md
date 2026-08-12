## 1. Regression Evidence

- [x] 1.1 Add a real-process test that holds 100 partial connections, proves active sockets and thread growth are bounded, and verifies health recovery after release
- [x] 1.2 Add real-process framing and timeout cases for request-line, header, body, idle-read, and listener recovery behavior
- [x] 1.3 Add a real-process shutdown case proving stdin EOF interrupts partial connections and exits within 1.5 seconds without client-first close
- [x] 1.4 Run the new cases against the current implementation and record the expected admission and shutdown failures before implementation

## 2. Bounded HTTP Transport

- [x] 2.1 Introduce typed HTTP request, read-error, and production policy boundaries with focused Rust tests
- [x] 2.2 Implement bounded incremental request framing, strict content length, body admission, idle/total read deadlines, and bounded response writes
- [x] 2.3 Map transport failures to the specified HTTP statuses and existing public error codes without entering business dispatch

## 3. Connection and Shutdown Ownership

- [x] 3.1 Add the sixteen-slot active connection owner with RAII release, immediate unqueued overload response, and completed-handler reaping
- [x] 3.2 Interrupt active sockets before bounded handler drain and preserve safe owner cleanup when a handler misses the 500 ms deadline
- [x] 3.3 Preserve lifecycle success-response ordering while guaranteeing shutdown continues after response failure

## 4. Documentation and Verification

- [x] 4.1 Update current runtime documentation and append third-stage evidence, identity, remaining blockers, and non-release scope to the premerge audit
- [x] 4.2 Run Rust format, Clippy, workspace tests, build, focused Node lifecycle/HTTP tests, service/contract/capability gates, strict OpenSpec validation, Prettier, and diff checks
