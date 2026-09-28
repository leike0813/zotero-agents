# Spec Delta

## Purpose

Provide one project-owned contract for a resolved long-lived child process and its byte streams across Zotero and Node runtimes, including bounded resource use and honest lifecycle evidence.

## ADDED Requirements

### Requirement: Long-lived stdio process SHALL accept resolved execution input

The platform interface SHALL accept an executable, argument vector, working directory, and sanitized environment. It SHALL NOT resolve commands or interpret shell text.

#### Scenario: Caller launches a resolved command

- **WHEN** a caller supplies a resolved executable and arguments
- **THEN** the selected runtime adapter SHALL launch that exact command shape
- **AND** the caller SHALL receive stdin, stdout, stderr, wait, and termination operations.

### Requirement: Stdio streams SHALL be separate and bounded

The interface SHALL keep stdout and stderr separate, preserve byte order within each stream, and apply explicit bounds to pending input and output. Closing stdin SHALL signal EOF without implicitly terminating the process.

#### Scenario: Child emits interleaved streams

- **WHEN** a child writes stdout and stderr
- **THEN** callers SHALL read each stream independently and in order.

#### Scenario: Buffered data exceeds a bound

- **WHEN** pending stream bytes exceed a configured bound
- **THEN** the operation SHALL fail explicitly and attempt bounded cleanup
- **AND** it SHALL NOT silently discard bytes or grow without limit.

#### Scenario: Caller closes stdin

- **WHEN** the caller closes stdin while the child still runs
- **THEN** the child SHALL observe EOF
- **AND** stdout, stderr, and exit observation SHALL remain available.

### Requirement: Process termination SHALL expose observed evidence

The interface SHALL distinguish observed exit, confirmed termination, and unknown outcome. Disconnect, cancellation, timeout, or a sent kill request SHALL NOT by themselves prove child exit.

#### Scenario: Process exits naturally

- **WHEN** the adapter observes a child exit
- **THEN** wait SHALL settle with its exit code when available and observed-exit evidence.

#### Scenario: Termination cannot be confirmed

- **WHEN** cleanup is requested but no child exit or equivalent proof is observed within the bound
- **THEN** the result SHALL report an unknown termination outcome.

### Requirement: Runtime adapter selection SHALL preserve host compatibility

Node tests SHALL use a Node adapter, Linux and macOS Zotero SHALL use Mozilla Subprocess, and Windows Zotero SHALL use a loopback WebSocket broker. No Node runtime SHALL be required by the Zotero plugin.

#### Scenario: Windows Zotero launches a child

- **WHEN** a Windows Zotero caller starts a long-lived process
- **THEN** the broker SHALL own one child for that connection and reuse the singleton daemon for other connections.

#### Scenario: Linux Zotero launches a child

- **WHEN** a Linux Zotero caller starts a long-lived process
- **THEN** the Mozilla adapter SHALL own its streams without requiring the Windows binary.
