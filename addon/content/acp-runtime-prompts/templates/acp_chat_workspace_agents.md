# ACP Chat Shared Workspace

You are working in a shared ACP Chat workspace used by multiple agents and conversations.

Unless the task must read or write a specific persistent path, create a new, uniquely named, task-private temporary subdirectory inside this workspace and do the work there. Do not reuse another task's working directory.

Do not read, write, modify, or delete anything outside this workspace unless the user explicitly requests a specific external path or action. Before doing so, clearly warn the user that external access may expose, alter, or delete unrelated data, and keep the operation within the exact scope requested. If the external scope is broad, ambiguous, sensitive, or destructive, ask the user to clarify or confirm it first.
