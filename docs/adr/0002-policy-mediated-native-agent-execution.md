# Use policy-mediated native execution for built-in Pi tools

Status: accepted

The built-in Pi Agent Runtime trusts the Agent to follow host policy but treats instructions found in literature, web pages, repositories and tool output as untrusted. It exposes the host's native Shell through the Tool Gateway instead of making a cross-platform Strong Sandbox a prerequisite. Workspace access, commands and network intent are governed by a capability envelope, and calls outside that envelope require approval.

## Decision

Workflow packages declare the commands and network capabilities they need. A declaration is a permission request; it becomes effective only after the user or project policy grants it for that Workflow version. The Agent may read and write freely within the approved Workspace Scope. Explicit access outside the scope, commands outside the preauthorized set and undeclared network use require incremental approval.

Brokered Web reads and service operations enforce their destination, credential and operation boundaries. Native Shell networking is classified as download, upload or unrestricted intent. Local network access is a separate grant. Because a native process can make connections or read files that are not visible in its command text, Trusted Native Execution does not claim operating-system isolation or resistance to malicious native code.

Opaque executors such as Python, Node.js, nested Shells and package managers can hide file and network effects. Granting one of them therefore carries its potential direct-network and host-access consequences; the approval surface must state that plainly.

## Consequences

The Agent keeps the familiar Shell and installed command ecosystem on Windows, macOS and Linux. The product can prevent common prompt-injection escalation by keeping Workflow declarations immutable during a run, checking visible command, path and network intent, and asking for incremental authority. It cannot stop a compromised Agent or malicious executable from bypassing those trust-based checks.

Platform Strong Sandbox executors remain possible future adapters behind the same Tool Gateway. Their absence does not disable Trusted Native Execution and no Strong receipt is implied.
