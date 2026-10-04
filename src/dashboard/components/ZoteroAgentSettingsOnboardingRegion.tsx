/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Onboarding: connect first, then choose a model, then use it. Nothing here
// assigns a default or runs inference; the page only reports what is already
// saved and offers the next explicit action.

import { memo } from "preact/compat";
import { equalBySignature } from "../../shared/regionEquality";
import type {
  OverviewSelection,
  SettingsPage,
  ZoteroAgentSettingsHandlers,
} from "./ZoteroAgentSettingsView";
import { Badge, Button, Header, text } from "./ZoteroAgentSettingsControls";

export const OverviewRegion = memo(
  function OverviewRegion(props: {
    selection: OverviewSelection;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    const { selection, handlers } = props;
    const { labels } = selection;
    return (
      <div class="zs-content" data-testid="overview-content">
        <Header
          title={text(labels, "navOverview", "Get started")}
          description={text(
            labels,
            "overviewToolsNote",
            "Connect first, then choose a model; tools can be configured later.",
          )}
        />
        <div class="zs-content-body">
          <div class="zs-hero">
            <h2>{selection.hero.title}</h2>
            <p class="muted">{selection.hero.description}</p>
          </div>
          <ol
            class="zs-steps"
            aria-label={text(labels, "setupProgress", "Setup progress")}
          >
            {selection.steps.map((step, index) => (
              <li
                key={step.id}
                class={"zs-step is-" + step.state}
                data-testid={"step-" + step.id}
              >
                <span class="zs-step-mark">
                  {step.state === "complete" ? "✓" : index + 1}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
          {selection.setupChoices && (
            <div class="zs-stack" data-testid="overview-setup">
              {selection.setupChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  class="zs-setup-choice"
                  data-testid={"setup-" + choice.id}
                  onClick={() =>
                    handlers.startAddConnection(
                      choice.id as "chatgpt" | "api-key" | "custom",
                    )
                  }
                >
                  <span class="zs-mark">{choice.mark}</span>
                  <span>
                    <strong>{choice.title}</strong>
                    <small>{choice.description}</small>
                  </span>
                  <span class="zs-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
          {!selection.setupChoices && (
            <div class="zs-card" data-testid="overview-tasks">
              {selection.tasks.map((task) => (
                <div class="zs-task" key={task.id}>
                  <div>
                    <h3>{task.title}</h3>
                    <small class="muted">{task.detail}</small>
                  </div>
                  <Button
                    labels={undefined}
                    primary={task.primary}
                    testId={"overview-" + task.id}
                    onClick={() => {
                      if (task.id === "connections" || task.id === "general") {
                        handlers.navigate("connections");
                        return;
                      }
                      handlers.navigate(task.id as SettingsPage);
                    }}
                  >
                    {task.actionLabel}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.selection, next.selection),
);

export { Badge };
