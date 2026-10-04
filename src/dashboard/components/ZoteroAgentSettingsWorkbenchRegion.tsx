/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Model workbench: one connection, many model cards. Cards own their options,
// their default purposes and their own test result, so nothing on this page can
// silently become the default and one card's result never annotates another.

import { memo } from "preact/compat";
import { equalBySignature } from "../../shared/regionEquality";
import type {
  AccountView,
  ModelCardView,
  PurposeKey,
  ZoteroAgentSettingsHandlers,
  WorkbenchSelection,
} from "./ZoteroAgentSettingsView";
import {
  Badge,
  Banner,
  Button,
  Choice,
  Header,
  Switch,
  text,
  type SettingsLabels,
} from "./ZoteroAgentSettingsControls";

function ModelCard(props: {
  card: ModelCardView;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { card, labels, handlers } = props;
  return (
    <article class="zs-card zs-model-card" data-testid={"card-" + card.id}>
      <div class="zs-row zs-spread">
        <div>
          <strong>{card.name}</strong>
          <small class="muted">{card.note}</small>
          {card.overlayApplied && (
            <small class="muted" data-testid={"card-overlay-" + card.id}>
              {text(
                labels,
                "cardOverlay",
                "Supplement adopted: its limits apply to this model.",
              )}
            </small>
          )}
        </div>
        {card.reasoning ? (
          <Choice
            label={card.name + " reasoning"}
            value={card.reasoning.value}
            options={card.reasoning.options}
            testId={"reasoning-" + card.id}
            onChange={(value) => handlers.setCardReasoning(card.id, value)}
          />
        ) : (
          <Badge>{text(labels, "noReasoning", "No reasoning")}</Badge>
        )}
      </div>
      <div
        class="zs-purposes"
        aria-label={text(labels, "purposesLabel", "Set default purposes")}
      >
        {card.purposes.map((purpose) => (
          <button
            key={purpose.key}
            type="button"
            class={
              "zs-purpose" +
              (purpose.state === "assigned" ? " is-assigned" : "") +
              (purpose.state === "inherited" ? " is-inherited" : "")
            }
            aria-pressed={purpose.state === "assigned"}
            aria-label={purpose.title}
            title={purpose.title}
            disabled={purpose.disabled}
            data-testid={"purpose-" + card.id + "-" + purpose.key}
            onClick={() =>
              handlers.assignPurpose(
                card.id,
                purpose.key as PurposeKey,
                purpose.state === "assigned" ? undefined : card.id,
              )
            }
          >
            {purpose.state === "assigned"
              ? "✓ " + purpose.label
              : purpose.state === "inherited"
                ? purpose.label + " · follows general"
                : "Set as " + purpose.label.toLowerCase()}
          </button>
        ))}
      </div>
      <div class="zs-row zs-spread">
        <Badge tone={card.test ? card.test.tone : "muted"}>
          {card.test ? card.test.label : text(labels, "testNone", "Not tested")}
        </Badge>
        <div class="zs-row">
          <Button
            labels={labels}
            small
            disabled={!card.canTest || card.testPending}
            testId={"test-" + card.id}
            onClick={() => handlers.requestModelTest(card.id)}
          >
            {card.testLabel}
          </Button>
          <Button
            labels={labels}
            small
            danger
            disabled={!card.removable}
            testId={"remove-" + card.id}
            onClick={() => handlers.requestRemoveModel(card.id)}
          >
            {text(labels, "removeModel", "Remove model")}
          </Button>
        </div>
      </div>
      {card.testDetail && (
        <p class="muted" role="status" data-testid={"test-detail-" + card.id}>
          {card.testDetail}
        </p>
      )}
    </article>
  );
}

function AccountBlock(props: {
  account: AccountView;
  connectionId: string;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { account, connectionId, labels, handlers } = props;
  const entry = account.registration;
  return (
    <div class="zs-stack" data-testid="account-block">
      <div class="zs-row zs-spread">
        <div>
          <strong>
            {entry?.label ||
              text(labels, "accountConnect", "Use a ChatGPT account")}
          </strong>
          {entry?.email && <p class="muted">{entry.email}</p>}
          {entry?.workspace && <p class="muted">{entry.workspace}</p>}
        </div>
        <Badge tone={account.stateTone}>{account.stateLabel}</Badge>
      </div>
      {account.notice && (
        <Banner
          tone={account.notice.tone}
          testId={"account-" + account.notice.id}
        >
          <strong>{account.notice.title}</strong>
          <p>{account.notice.description}</p>
          <Button
            labels={labels}
            testId={"account-" + account.notice.id}
            onClick={() => {
              if (account.notice?.action === "usage") {
                handlers.openUsage(account.registrationId);
              } else if (account.notice?.action === "accept-welcome") {
                handlers.acceptWelcome(account.registrationId);
              } else {
                handlers.connectAccount(
                  connectionId,
                  account.registrationId,
                  account.notice?.action === "reauthorize",
                );
              }
            }}
          >
            {account.notice.actionLabel}
          </Button>
        </Banner>
      )}
      {account.progress ? (
        <div class="zs-row" role="status" data-testid="auth-progress">
          <span class="zs-spinner" aria-hidden="true" />
          <span>{account.progress.phase}</span>
          <Button
            labels={labels}
            small
            testId="auth-cancel"
            onClick={() => handlers.cancelAuthorization()}
          >
            {account.progress.cancelLabel}
          </Button>
        </div>
      ) : (
        account.canConnect && (
          <Button
            labels={labels}
            primary
            testId="account-connect"
            onClick={() =>
              entry && handlers.connectAccount(connectionId, entry.id, false)
            }
          >
            {account.connectLabel}
          </Button>
        )
      )}
      {account.canSignOut && (
        <div class="zs-row">
          <Button
            labels={labels}
            small
            testId="account-signout"
            onClick={() =>
              entry && handlers.requestRegistrationRemoval(entry.id, false)
            }
          >
            {text(labels, "signOut", "Sign out")}
          </Button>
          <Button
            labels={labels}
            small
            testId="account-usage"
            onClick={() => handlers.openUsage(account.registrationId)}
          >
            {text(labels, "manageUsage", "Manage usage")}
          </Button>
        </div>
      )}
      {account.canRemove && (
        <Button
          labels={labels}
          small
          danger
          testId="account-remove"
          onClick={() =>
            handlers.requestRegistrationRemoval(account.registrationId, true)
          }
        >
          {text(labels, "removeAuthorization", "Remove this authorization")}
        </Button>
      )}
    </div>
  );
}

export const WorkbenchRegion = memo(
  function WorkbenchRegion(props: {
    selection: WorkbenchSelection;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    const { selection, handlers } = props;
    const labels = selection.labels;
    const detail = selection.detail;
    return (
      <div class="zs-content" data-testid="workbench-content">
        <Header
          title={selection.title}
          description={selection.description}
          action={
            <Button
              labels={selection.labels}
              primary
              testId="workbench-add"
              onClick={() => handlers.navigate("overview")}
            >
              {selection.addLabel}
            </Button>
          }
        />
        <div class="zs-content-body">
          {selection.empty ? (
            <div class="zs-empty" data-testid="workbench-empty">
              <h2>{selection.empty.title}</h2>
              <p class="muted">{selection.empty.description}</p>
              <div class="zs-row">
                <Button
                  labels={selection.labels}
                  primary
                  testId="workbench-empty-chatgpt"
                  onClick={() => handlers.startAddConnection("chatgpt")}
                >
                  {selection.empty.primaryLabel}
                </Button>
                <Button
                  labels={selection.labels}
                  testId="workbench-empty-api"
                  onClick={() => handlers.startAddConnection("api-key")}
                >
                  {selection.empty.secondaryLabel}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                class="zs-purpose-summary"
                aria-label={text(
                  selection.labels,
                  "currentDefaultsLabel",
                  "Current default models",
                )}
              >
                {selection.purposes.map((purpose) => (
                  <button
                    key={purpose.key}
                    type="button"
                    class="zs-purpose-summary-item"
                    disabled={!purpose.connectionId}
                    title={purpose.value}
                    data-testid={"purpose-summary-" + purpose.key}
                    onClick={() =>
                      handlers.selectConnection(purpose.connectionId)
                    }
                  >
                    <span class="zs-row zs-spread">
                      <strong>{purpose.label}</strong>
                      {purpose.note && <small>{purpose.note}</small>}
                    </span>
                    <span>{purpose.value}</span>
                    {purpose.detail && (
                      <small class="muted">{purpose.detail}</small>
                    )}
                  </button>
                ))}
              </div>
              <div class="zs-master-detail">
                <div
                  class="zs-connection-list"
                  aria-label={text(
                    selection.labels,
                    "connectionListLabel",
                    "Model connections",
                  )}
                >
                  {selection.rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      class={
                        "zs-connection-row" +
                        (row.selected ? " is-selected" : "")
                      }
                      data-testid={"connection-" + row.id}
                      onClick={() => handlers.selectConnection(row.id)}
                    >
                      <span class="zs-mark">{row.mark}</span>
                      <span>
                        <strong>{row.label}</strong>
                        <small class="muted">{row.stateLabel}</small>
                        {row.purposes.length > 0 && (
                          <small class="zs-connection-purposes">
                            {row.purposes.join(" · ")}
                          </small>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                {detail && (
                  <div
                    class="zs-detail"
                    data-testid={"connection-detail-" + detail.id}
                  >
                    <div class="zs-row zs-spread">
                      <h3>{detail.label}</h3>
                      <Badge tone={detail.stateTone}>{detail.stateLabel}</Badge>
                    </div>
                    {detail.repair && (
                      <Banner tone="warning" testId="connection-repair">
                        <strong>{detail.repair.label}</strong>
                        <p>{detail.repair.description}</p>
                      </Banner>
                    )}
                    {detail.account ? (
                      <details
                        class="zs-account"
                        open={!detail.account.signedIn}
                      >
                        <summary>
                          <strong>
                            {text(
                              labels,
                              "accountAndLogin",
                              "Account and sign-in",
                            )}
                          </strong>
                        </summary>
                        <AccountBlock
                          account={detail.account}
                          connectionId={detail.id}
                          labels={selection.labels}
                          handlers={handlers}
                        />
                      </details>
                    ) : (
                      <div class="zs-detail-lines">
                        {detail.lines.map((line) => (
                          <div class="zs-detail-line" key={line.label}>
                            <span class="muted">{line.label}</span>
                            <span>{line.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {detail.discovery && (
                      <Banner
                        tone={detail.discovery.tone}
                        testId="connection-discovery"
                      >
                        {detail.discovery.text}
                      </Banner>
                    )}
                    {detail.saveFailure && (
                      <Banner tone="warning" testId="connection-failure">
                        {detail.saveFailure}
                      </Banner>
                    )}
                    <div class="zs-row zs-spread">
                      <h3>
                        {text(
                          labels,
                          "modelsAndPurposes",
                          "Models and default purposes",
                        )}
                      </h3>
                      <div class="zs-row">
                        {detail.canAddModel && (
                          <Button
                            labels={selection.labels}
                            small
                            testId={"add-model-" + detail.id}
                            onClick={() => handlers.openModelPicker(detail.id)}
                          >
                            {text(labels, "addModel", "Add model")}
                          </Button>
                        )}
                        {detail.account && (
                          <Button
                            labels={selection.labels}
                            small
                            disabled={detail.refreshPending}
                            testId={"refresh-" + detail.id}
                            onClick={() =>
                              handlers.refreshAccountModels(detail.id)
                            }
                          >
                            {detail.refreshLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                    {detail.modelsEmptyHint && (
                      <Banner>{detail.modelsEmptyHint}</Banner>
                    )}
                    <div class="zs-stack" data-testid="model-cards">
                      {detail.models.map((card) => (
                        <ModelCard
                          key={card.id}
                          card={card}
                          labels={selection.labels}
                          handlers={handlers}
                        />
                      ))}
                    </div>
                    <div class="zs-row">
                      <Button
                        labels={selection.labels}
                        testId={"edit-" + detail.id}
                        onClick={() => handlers.editConnection(detail.id)}
                      >
                        {text(labels, "editConnection", "Edit connection")}
                      </Button>
                      <Button
                        labels={selection.labels}
                        danger
                        testId={"remove-connection-" + detail.id}
                        onClick={() =>
                          handlers.requestRemoveConnection(detail.id)
                        }
                      >
                        {text(labels, "removeConnection", "Remove connection")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.selection, next.selection),
);

export { Switch };
