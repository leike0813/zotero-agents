# Design

## Stable Transcript Semantics

ACP Skills streaming chunks are part of the same assistant or thought item until
the stream finalizes. Status items such as `workspace-activity` are side-band
events and must not become the boundary that forces later chunks into a new
assistant message.

## Stable Drawer Rendering

The shared assistant drawer renderer should preserve the drawer container and
task rows across snapshots. Timestamp-only changes may update text fields, but
must not replace the entire drawer subtree while it is open. This protects
hover, focus, button hit testing, and in-progress clicks.

## Composer State

ACP Skills composer state is derived from two axes:

- run execution state: queued/running/repairing/waiting/terminal
- conversation availability: active/connected/available/unavailable

Running states disable text input and keep the primary button as an interrupt or
cancel action. Waiting states enable text input only when no permission request
is pending and the conversation can accept a reply.

## Workspace and Sidebar Routing

Opening the unified workspace should preserve the user intent of an already-open
assistant sidebar. Dashboard task entry points should route ACP Skills tasks to
the unified assistant sidebar, select `acp-skills`, and select the target
request id.

## Synthesis Action Wording

The Synthesis Workbench primary creation action is a topic creation command.
The user-facing label is `Create Topic`; the existing host command can remain
unchanged as an implementation detail.
