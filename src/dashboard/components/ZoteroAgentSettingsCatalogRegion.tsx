/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Directory browsing plus the three owner-scoped maintenance sections. Account
// discovery is not here: it belongs to the connection it describes.

import { memo } from "preact/compat";
import { equalBySignature } from "../../shared/regionEquality";
import type {
  CatalogSelection,
  ZoteroAgentSettingsHandlers,
} from "./ZoteroAgentSettingsView";
import {
  Badge,
  Banner,
  Button,
  Choice,
  Field,
  Header,
  Switch,
  text,
} from "./ZoteroAgentSettingsControls";

function ModelRows(props: {
  selection: CatalogSelection;
  onAdd?: (modelKey: string) => void;
  testIdPrefix: string;
}) {
  const paging = props.selection.paging;
  const labels = props.selection.labels;
  return (
    <div class="zs-stack" data-testid={props.testIdPrefix + "-models"}>
      <div class="zs-row zs-spread">
        <small class="muted">{props.selection.counts}</small>
        <div class="zs-row">
          <Button
            labels={props.selection.labels}
            small
            disabled={!paging.canPrevious}
            testId={props.testIdPrefix + "-prev"}
            onClick={() => undefined}
          >
            {text(labels, "previousPage", "Previous page")}
          </Button>
          <small>
            {paging.page} / {paging.pageCount}
          </small>
          <Button
            labels={props.selection.labels}
            small
            disabled={!paging.canNext}
            testId={props.testIdPrefix + "-next"}
            onClick={() => undefined}
          >
            {text(labels, "nextPage", "Next page")}
          </Button>
        </div>
      </div>
      {props.selection.models.map((model) => (
        <div class="zs-model-row" key={model.key}>
          <div>
            <strong>{model.name}</strong>
            <small class="muted">{model.detail}</small>
          </div>
          <div class="zs-row">
            {model.badge && (
              <Badge tone={model.badge.tone}>{model.badge.label}</Badge>
            )}
            {props.onAdd ? (
              <Button
                labels={props.selection.labels}
                small
                disabled={model.addDisabled}
                testId={"add-" + model.key}
                onClick={() => props.onAdd?.(model.key)}
              >
                {model.addLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      {props.selection.emptyHint && (
        <small class="muted">{props.selection.emptyHint}</small>
      )}
    </div>
  );
}

export const CatalogRegion = memo(
  function CatalogRegion(props: {
    selection: CatalogSelection;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    const { selection, handlers } = props;
    const labels = selection.labels;
    return (
      <div class="zs-content" data-testid="catalog-content">
        <Header title={selection.title} description={selection.description} />
        <div class="zs-content-body">
          <section class="zs-card zs-stack" data-testid="catalog-browse">
            <div class="zs-row zs-spread">
              <h3>
                {text(labels, "catalogBrowse", "Preset providers and models")}
              </h3>
            </div>
            <label class="zs-field">
              <span>{text(labels, "catalogProvider", "Provider")}</span>
              <Choice
                label={text(labels, "catalogProvider", "Provider")}
                value={selection.providerId}
                options={selection.providerOptions}
                testId="catalog-provider"
                onChange={(value) => handlers.setCatalogProvider(value)}
              />
            </label>
            <Field
              label={text(labels, "catalogSearch", "Search directory models")}
              value={selection.query}
              testId="catalog-query"
              onInput={(value) => handlers.setCatalogQuery(value)}
            />
            {selection.providerSummary && (
              <div class="zs-row zs-spread">
                <small class="muted">{selection.providerSummary}</small>
                {selection.providerAction && (
                  <Button
                    labels={selection.labels}
                    small
                    disabled={selection.providerAction.disabled}
                    testId="catalog-add-provider"
                    onClick={() => handlers.startAddConnection("api-key")}
                  >
                    {selection.providerAction.label}
                  </Button>
                )}
              </div>
            )}
            {selection.providerReason && (
              <Banner tone="warning" testId="catalog-provider-reason">
                {selection.providerReason}
              </Banner>
            )}
            <ModelRows selection={selection} testIdPrefix="catalog" />
          </section>
          {selection.sections.map((section) => (
            <details
              class="zs-card zs-maintenance"
              key={section.id}
              data-testid={"maintenance-" + section.id}
            >
              <summary>
                <strong>{section.title}</strong>
                <Badge>{section.badge}</Badge>
              </summary>
              <div class="zs-maintenance-body zs-stack">
                <p class="muted">{section.description}</p>
                {section.switch && (
                  <Switch
                    checked={section.switch.checked}
                    disabled={section.switch.disabled}
                    ariaLabel={section.switch.label}
                    onChange={(checked) =>
                      handlers.runMaintenance(
                        section.id,
                        "auto-update",
                        checked,
                      )
                    }
                  >
                    {section.switch.label}
                  </Switch>
                )}
                <div class="zs-row">
                  {section.controls.map((control) => (
                    <Button
                      key={control.id}
                      labels={selection.labels}
                      danger={control.danger}
                      disabled={control.disabled}
                      testId={"maintenance-" + section.id + "-" + control.id}
                      onClick={() =>
                        handlers.runMaintenance(section.id, control.id)
                      }
                    >
                      {control.label}
                    </Button>
                  ))}
                </div>
                {section.hint && <small class="muted">{section.hint}</small>}
                {section.feedback && (
                  <Banner
                    tone={section.feedback.tone}
                    testId={"maintenance-feedback-" + section.id}
                  >
                    {section.feedback.text}
                  </Banner>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.selection, next.selection),
);

export { ModelRows };
