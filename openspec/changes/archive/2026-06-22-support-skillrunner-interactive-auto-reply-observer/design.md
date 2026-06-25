# Design

The feature is controlled by a hard-coded plugin switch. When disabled, UI
fields are hidden, persisted provider options are normalized away, and provider
dispatch never writes `runtime_options.interactive_auto_reply`.

When enabled, the option is still limited to interactive SkillRunner jobs. A
new observer module owns only the small gap created by backend auto reply:
while a run is locally `waiting_user`, the observer polls the backend job state
at a low cadence. If the backend is still waiting, it does nothing. If the
backend has resumed or reached terminal state, it stops and calls existing
foreground continuation. Foreground continuation remains the only code path
that fetches output and applies results.

User reply gets an additional guard only for auto-reply-enabled runs. Before
sending reply, the plugin checks current backend state. If the backend already
left waiting, it skips the reply and hands off to foreground continuation. If a
reply request races with backend auto reply and fails with a terminal client
status, the plugin checks backend state again before deciding whether to show
an error or settle the run.

Observer lifecycle is explicitly bounded. Production shutdown clears all
observer timers. A successful user reply stops the observer before foreground
continuation starts. Each observer tick revalidates the local run record before
touching the backend, and stops when the run is no longer an active
auto-reply-enabled `waiting_user` run. Backend reachability failures also stop
the observer; the reachability recovery sweep is responsible for recreating an
observer if the backend later becomes reachable and the run is still waiting.

When enabled, `interactive_reply_timeout_sec` is exposed as an optional
interactive-only provider option. It is only visible and submitted when
`interactive_auto_reply` is enabled for that run. The value is a non-negative
integer in seconds; empty means the backend default. The observer may use this
value to display a best-effort countdown, but the countdown is only UI
diagnostic state and never drives execution.
