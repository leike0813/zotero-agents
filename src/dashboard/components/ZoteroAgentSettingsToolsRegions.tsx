/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// MCP and search pages. Both keep their source state in their own region: a
// test result, an enablement toggle or an order change in one source never
// rebuilds another source's editor DOM, and a saved secret is never refilled
// into an input or projected back.

import { memo } from "preact/compat";
import { equalBySignature } from "../../shared/regionEquality";
import type {
  BindingEntryView,
  McpSelection,
  SearchSelection,
  ZoteroAgentSettingsHandlers,
} from "./ZoteroAgentSettingsView";
import {
  Badge,
  Banner,
  Button,
  Header,
  Switch,
  text,
  type SettingsLabels,
} from "./ZoteroAgentSettingsControls";

function BindingRows(props: {
  labels: SettingsLabels;
  entries: BindingEntryView[];
  group: string;
  onField: (id: string, field: string) => void;
  onValue: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const { labels, entries, onField, onValue, onRemove } = props;
  return (
    <div class="zs-bindings" data-testid={"bindings-" + props.group}>
      {!entries.length && (
        <small class="muted">
          {text(labels, "noEntries", "None yet. Add one when you need it.")}
        </small>
      )}
      {entries.map((entry) => (
        <div class="zs-binding-entry" key={entry.id}>
          <label class="zs-field">
            <span>{text(labels, "bindingField", "Field")}</span>
            <input
              value={entry.field}
              aria-label={entry.ariaField}
              autocomplete="off"
              data-testid={"binding-field-" + entry.id}
              onInput={(event) =>
                onField(
                  entry.id,
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </label>
          <label class="zs-field">
            <span>{text(labels, "bindingValue", "Value")}</span>
            <input
              type="password"
              value={entry.value}
              placeholder={entry.placeholder}
              aria-label={entry.ariaValue}
              autocomplete="off"
              data-testid={"binding-value-" + entry.id}
              onInput={(event) =>
                onValue(
                  entry.id,
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </label>
          <Button
            labels={labels}
            small
            testId={"binding-remove-" + entry.id}
            onClick={() => onRemove(entry.id)}
          >
            {entry.removeLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}

export const McpRegion = memo(
  function McpRegion(props: {
    selection: McpSelection;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    const { selection, handlers } = props;
    const labels = selection.labels;
    return (
      <div class="zs-content" data-testid="mcp-content">
        <Header
          title={selection.title}
          description={selection.description}
          action={
            <Button
              labels={selection.labels}
              primary
              testId="mcp-add"
              onClick={() => handlers.addMcpSource()}
            >
              {selection.addLabel}
            </Button>
          }
        />
        <div class="zs-content-body">
          <div class="zs-row" data-testid="mcp-json-actions">
            <Button
              labels={selection.labels}
              testId="mcp-json-edit"
              onClick={() => handlers.openMcpJson("edit")}
            >
              {selection.jsonLabels.edit}
            </Button>
            <Button
              labels={selection.labels}
              testId="mcp-json-import"
              onClick={() => handlers.openMcpJson("import")}
            >
              {selection.jsonLabels.import}
            </Button>
            <Button
              labels={selection.labels}
              disabled={!selection.sources.length}
              testId="mcp-json-export"
              onClick={() => handlers.openMcpJson("export")}
            >
              {selection.jsonLabels.export}
            </Button>
          </div>
          {selection.empty ? (
            <div class="zs-empty" data-testid="mcp-empty">
              <h2>{selection.empty.title}</h2>
              <p class="muted">{selection.empty.description}</p>
              <Button
                labels={selection.labels}
                primary
                testId="mcp-empty-add"
                onClick={() => handlers.addMcpSource()}
              >
                {selection.empty.actionLabel}
              </Button>
            </div>
          ) : (
            <div class="zs-stack" data-testid="mcp-sources">
              {selection.sources.map((source) => (
                <article
                  class="zs-card"
                  key={source.id}
                  data-testid={"mcp-source-" + source.id}
                >
                  <div class="zs-row zs-spread">
                    <div>
                      <h3>{source.label}</h3>
                      <small class="muted">
                        {source.transportLabel} · {source.address}
                      </small>
                    </div>
                    <Switch
                      checked={source.enabled}
                      ariaLabel={source.label + " enabled"}
                      onChange={(enabled) =>
                        handlers.toggleMcpSourceEnabled(source.id, enabled)
                      }
                    >
                      {text(labels, "enabled", "Enabled")}
                    </Switch>
                  </div>
                  <div class="zs-row zs-spread">
                    <Badge tone={source.admission.tone}>
                      {source.pendingSecret
                        ? text(
                            selection.labels,
                            "mcpNeedsSecret",
                            "Authentication information is still missing",
                          )
                        : source.admission.text}
                    </Badge>
                    <div class="zs-row">
                      {source.test && (
                        <Badge tone={source.test.tone}>
                          {source.test.label}
                        </Badge>
                      )}
                      <Button
                        labels={selection.labels}
                        small
                        disabled={!source.canTest || source.testPending}
                        testId={"mcp-test-" + source.id}
                        onClick={() => handlers.requestTestMcpSource(source.id)}
                      >
                        {text(labels, "testConnection", "Test connection")}
                      </Button>
                      <Button
                        labels={selection.labels}
                        small
                        testId={"mcp-edit-" + source.id}
                        onClick={() => handlers.editMcpSource(source.id)}
                      >
                        {source.editLabel}
                      </Button>
                      <Button
                        labels={selection.labels}
                        small
                        danger
                        testId={"mcp-remove-" + source.id}
                        onClick={() =>
                          handlers.requestRemoveMcpSource(source.id)
                        }
                      >
                        {source.removeLabel}
                      </Button>
                    </div>
                  </div>
                  {source.testDetail && (
                    <p class="muted" role="status">
                      {source.testDetail}
                    </p>
                  )}
                </article>
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

export const SearchRegion = memo(
  function SearchRegion(props: {
    selection: SearchSelection;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    const { selection, handlers } = props;
    const labels = selection.labels;
    return (
      <div class="zs-content" data-testid="search-content">
        <Header title={selection.title} description={selection.description} />
        <div class="zs-content-body">
          <Banner>{selection.banner}</Banner>
          <div class="zs-stack" data-testid="search-sources">
            {selection.rows.map((row) => (
              <article
                class="zs-card zs-source-row"
                key={row.id}
                data-testid={"search-source-" + row.id}
              >
                <div class="zs-stack">
                  <Switch
                    checked={row.enabled}
                    disabled={row.enabledDisabled}
                    ariaLabel={row.label + " enabled"}
                    onChange={(enabled) =>
                      handlers.toggleWebSourceEnabled(row.id, enabled)
                    }
                  >
                    <strong>{row.label}</strong>
                  </Switch>
                  <small class="muted">
                    {row.detail}
                    {row.billable
                      ? " · " +
                        text(
                          selection.labels,
                          "billableNote",
                          "may produce provider charges",
                        )
                      : ""}
                  </small>
                  {row.test && (
                    <Badge tone={row.test.tone}>{row.test.label}</Badge>
                  )}
                  {row.testDetail && (
                    <small class="muted" role="status">
                      {row.testDetail}
                    </small>
                  )}
                </div>
                <div class="zs-row">
                  <Button
                    labels={selection.labels}
                    small
                    disabled={!row.order.canMoveUp}
                    testId={"search-up-" + row.id}
                    onClick={() => handlers.moveWebSource(row.id, -1)}
                  >
                    {text(labels, "moveUp", "Move up")}
                  </Button>
                  <Button
                    labels={selection.labels}
                    small
                    disabled={!row.order.canMoveDown}
                    testId={"search-down-" + row.id}
                    onClick={() => handlers.moveWebSource(row.id, 1)}
                  >
                    {text(labels, "moveDown", "Move down")}
                  </Button>
                  <Button
                    labels={selection.labels}
                    small
                    testId={"search-configure-" + row.id}
                    onClick={() => handlers.editWebSource(row.id)}
                  >
                    {row.configureLabel}
                  </Button>
                  <Button
                    labels={selection.labels}
                    small
                    disabled={!row.canTest || row.testPending}
                    testId={"search-test-" + row.id}
                    onClick={() => handlers.requestTestWebSource(row.id)}
                  >
                    {row.testLabel}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.selection, next.selection),
);

export { BindingRows };
