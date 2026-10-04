/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// The dialog layer. At most one editor is open at a time, so a modal is a
// separate managed region: a result arriving for a card or a source behind the
// modal updates its own region without touching the open form.

import { memo } from "preact/compat";
import { equalBySignature } from "../../shared/regionEquality";
import type { PiExecutionApi } from "../../shared/piProviderContract";
import type {
  BindingEntryView,
  ConfirmSelection,
  ConnectionEditorSelection,
  LeaveSelection,
  McpEditorSelection,
  McpJsonSelection,
  ModelPickerSelection,
  PurposeKey,
  TestConfirmSelection,
  WebEditorSelection,
  ZoteroAgentSettingsHandlers,
  ZoteroAgentSettingsView,
} from "./ZoteroAgentSettingsView";
import {
  Badge,
  Banner,
  Button,
  Choice,
  Field,
  Modal,
  Switch,
  TextArea,
  text,
  type SettingsLabels,
} from "./ZoteroAgentSettingsControls";

function ConnectionEditorDialog(props: {
  selection: ConnectionEditorSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  // Narrow once: the closures below cannot rely on property narrowing.
  const registrationChoice = selection.registration;
  return (
    <Modal
      title={selection.title}
      testId="connection-editor"
      footer={
        <div class="zs-row">
          <span class="muted">{selection.hint}</span>
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="connection-editor-cancel"
            onClick={() => handlers.closeConnectionEditor()}
          >
            {selection.cancelLabel}
          </Button>
          <Button
            labels={labels}
            primary
            disabled={!selection.canSave || selection.pending}
            testId="connection-editor-save"
            onClick={() => handlers.saveConnectionDraft()}
          >
            {selection.saveLabel}
          </Button>
        </div>
      }
    >
      <fieldset class="zs-fields" disabled={selection.pending}>
        {selection.canSwitch && (
          <label class="zs-field">
            <span>
              {text(labels, "switchConnection", "Switch edited connection")}
            </span>
            <Choice
              label={text(
                labels,
                "switchConnection",
                "Switch edited connection",
              )}
              value={selection.connectionOptions[0]?.value || ""}
              options={selection.connectionOptions}
              testId="connection-editor-switch"
              onChange={(value) => handlers.switchEditedConnection(value)}
            />
          </label>
        )}
        {selection.repairNotice && (
          <Banner tone="warning" testId="connection-editor-repair">
            <strong>{selection.repairNotice.title}</strong>
            <p>{selection.repairNotice.description}</p>
            <Switch
              checked={selection.repairNotice.accepted}
              ariaLabel={text(
                labels,
                "acceptTarget",
                "Accept this service address",
              )}
              onChange={(checked) =>
                handlers.patchConnectionDraft({ acceptRepair: checked })
              }
            >
              {text(labels, "acceptTarget", "Accept this service address")}
            </Switch>
          </Banner>
        )}
        <Field
          label={text(labels, "connectionLabel", "Connection name")}
          value={selection.label}
          testId="connection-editor-label"
          onInput={(value) => handlers.patchConnectionDraft({ label: value })}
          onCommit={() => handlers.commitConnectionDraftField()}
        />
        {selection.provider && (
          <label class="zs-field">
            <span>{selection.provider.label}</span>
            <Choice
              label={selection.provider.label}
              value={selection.provider.value}
              options={selection.provider.options}
              disabled={selection.provider.locked}
              testId="connection-editor-provider"
              onChange={(value) =>
                handlers.patchConnectionDraft({
                  provider: value,
                  secret: "",
                })
              }
            />
          </label>
        )}
        {selection.parameters.map((parameter) => (
          <Field
            key={parameter.id}
            label={parameter.label}
            value={parameter.value}
            placeholder={parameter.placeholder}
            testId={"connection-editor-param-" + parameter.id}
            onInput={(value) =>
              handlers.patchConnectionDraft({
                parameters: {
                  ...(selection.parameters.length
                    ? Object.fromEntries(
                        selection.parameters.map((entry) => [
                          entry.id,
                          entry.value,
                        ]),
                      )
                    : {}),
                  [parameter.id]: value,
                },
              })
            }
            onCommit={() => handlers.commitConnectionDraftField()}
          />
        ))}
        {registrationChoice && (
          <>
            <label class="zs-field">
              <span>
                {text(labels, "registrationField", "ChatGPT account and space")}
              </span>
              <Choice
                label={text(
                  labels,
                  "registrationField",
                  "ChatGPT account and space",
                )}
                value={registrationChoice.value}
                options={registrationChoice.options}
                testId="connection-editor-registration"
                onChange={(value) => {
                  handlers.patchConnectionDraft({ registrationId: value });
                  // Switching the account scopes discovery to exactly that
                  // registration; it never borrows another account's facts.
                  if (value)
                    handlers.refreshAccountModels(
                      selection.existing
                        ? selection.connectionOptions.find(
                            (entry) => entry.value === value,
                          )?.value || value
                        : value,
                    );
                }}
              />
            </label>
            <Field
              label={registrationChoice.identity.label}
              value={registrationChoice.identity.value}
              help={registrationChoice.identity.help}
              testId="connection-editor-registration-label"
              onInput={(value) =>
                handlers.patchConnectionDraft({ registrationLabel: value })
              }
            />
            {selection.account && (
              <div class="zs-stack" data-testid="connection-editor-account">
                <div class="zs-row zs-spread">
                  <span>{selection.account.stateLabel}</span>
                  {selection.account.progress ? (
                    <div class="zs-row" role="status">
                      <span>{selection.account.progress.phase}</span>
                      <Button
                        labels={labels}
                        small
                        testId="connection-editor-auth-cancel"
                        onClick={() => handlers.cancelAuthorization()}
                      >
                        {selection.account.progress.cancelLabel}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      labels={labels}
                      small
                      testId="connection-editor-connect"
                      onClick={() =>
                        handlers.connectAccount(
                          selection.connectionOptions[0]?.value || "",
                          registrationChoice.value,
                          false,
                        )
                      }
                    >
                      {selection.account.connectLabel}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {selection.endpoint && (
          <Field
            label={text(labels, "endpointField", "Service address")}
            value={selection.endpoint.value}
            placeholder={selection.endpoint.placeholder}
            testId="connection-editor-endpoint"
            onInput={(value) =>
              handlers.patchConnectionDraft({
                baseUrl: value,
                localApproved: false,
              })
            }
            onCommit={() => handlers.commitConnectionDraftField()}
          />
        )}
        {selection.dialect && (
          <label class="zs-field">
            <span>{text(labels, "dialectField", "Interface type")}</span>
            <Choice
              label={text(labels, "dialectField", "Interface type")}
              value={selection.dialect.value}
              options={selection.dialect.options}
              testId="connection-editor-dialect"
              onChange={(value) =>
                handlers.patchConnectionDraft({ api: value as PiExecutionApi })
              }
            />
          </label>
        )}
        {selection.keyless && (
          <Switch
            checked={selection.keyless.checked}
            ariaLabel={selection.keyless.label}
            testId="connection-editor-keyless"
            onChange={(checked) =>
              handlers.patchConnectionDraft({ keyless: checked })
            }
          >
            {selection.keyless.label}
          </Switch>
        )}
        {selection.localApproval && (
          <Banner tone="warning" testId="connection-editor-local">
            <Switch
              checked={selection.localApproval.checked}
              ariaLabel={selection.localApproval.label}
              testId="connection-editor-local-approve"
              onChange={(checked) =>
                handlers.patchConnectionDraft({ localApproved: checked })
              }
            >
              {selection.localApproval.label}
            </Switch>
            <p>{selection.localApproval.address}</p>
          </Banner>
        )}
        {selection.secret && (
          <Field
            label={selection.secret.label}
            type="password"
            value={selection.secret.value}
            placeholder={selection.secret.placeholder}
            help={selection.secret.help}
            testId="connection-editor-secret"
            onInput={(value) =>
              handlers.patchConnectionDraft({ secret: value })
            }
          />
        )}
        {selection.failure && (
          <Banner tone="warning" testId="connection-editor-failure">
            {selection.failure}
          </Banner>
        )}
      </fieldset>
    </Modal>
  );
}

function BindingEditor(props: {
  entries: BindingEntryView[];
  labels: SettingsLabels;
  onField: (id: string, field: string) => void;
  onValue: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div class="zs-stack" data-testid={props.testIdPrefix}>
      {!props.entries.length && (
        <small class="muted">
          {text(
            props.labels,
            "noEntries",
            "None yet. Add one when you need it.",
          )}
        </small>
      )}
      {props.entries.map((entry) => (
        <div class="zs-binding-entry" key={entry.id}>
          <Field
            label={text(props.labels, "bindingField", "Field")}
            value={entry.field}
            ariaLabel={entry.ariaField}
            testId={props.testIdPrefix + "-field-" + entry.id}
            onInput={(value) => props.onField(entry.id, value)}
          />
          <Field
            label={text(props.labels, "bindingValue", "Value")}
            type="password"
            value={entry.value}
            placeholder={entry.placeholder}
            ariaLabel={entry.ariaValue}
            testId={props.testIdPrefix + "-value-" + entry.id}
            onInput={(value) => props.onValue(entry.id, value)}
          />
          <Button
            labels={props.labels}
            small
            testId={props.testIdPrefix + "-remove-" + entry.id}
            onClick={() => props.onRemove(entry.id)}
          >
            {entry.removeLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}

function McpEditorDialog(props: {
  selection: McpEditorSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  const isStdio = selection.transport.value === "stdio";
  return (
    <Modal
      title={selection.title}
      testId="mcp-editor"
      footer={
        <div class="zs-row">
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="mcp-editor-cancel"
            onClick={() => handlers.cancelDialog()}
          >
            {selection.cancelLabel}
          </Button>
          <Button
            labels={labels}
            primary
            disabled={!selection.canSave || selection.pending}
            testId="mcp-editor-save"
            onClick={() => handlers.saveMcpDraft()}
          >
            {selection.saveLabel}
          </Button>
        </div>
      }
    >
      <fieldset class="zs-fields" disabled={selection.pending}>
        <Field
          label={text(labels, "sourceName", "Source name")}
          value={selection.label}
          testId="mcp-editor-label"
          onInput={(value) => handlers.patchMcpDraft({ label: value })}
        />
        <label class="zs-field">
          <span>{text(labels, "transportField", "Connection type")}</span>
          <Choice
            label={text(labels, "transportField", "Connection type")}
            value={selection.transport.value}
            options={selection.transport.options}
            testId="mcp-editor-transport"
            onChange={(value) =>
              handlers.patchMcpDraft({
                transport: value as "http" | "stdio",
              })
            }
          />
        </label>
        <Field
          label={selection.address.label}
          value={selection.address.value}
          testId="mcp-editor-address"
          onInput={(value) =>
            handlers.patchMcpDraft({ address: value, localApproved: false })
          }
          onCommit={() =>
            handlers.patchMcpDraft({ address: selection.address.value })
          }
        />
        {isStdio && (
          <>
            <section class="zs-stack" data-testid="mcp-editor-argv">
              <div class="zs-row zs-spread">
                <strong>
                  {text(labels, "argvLabel", "Program arguments")}
                </strong>
                <Button
                  labels={labels}
                  small
                  testId="mcp-editor-add-arg"
                  onClick={() => handlers.mcpArg({ type: "add" })}
                >
                  {selection.addArgLabel}
                </Button>
              </div>
              <small class="muted">{selection.argvHelp}</small>
              {selection.argv.map((argument, index) => (
                <div class="zs-binding-entry" key={index}>
                  <Field
                    label={
                      text(labels, "argLabel", "Argument") + " " + (index + 1)
                    }
                    value={argument.value}
                    testId={"mcp-editor-arg-" + index}
                    onInput={(value) => handlers.setMcpArg(index, value)}
                  />
                  <Button
                    labels={labels}
                    small
                    testId={"mcp-editor-remove-arg-" + index}
                    onClick={() => handlers.mcpArg({ type: "remove", index })}
                  >
                    {argument.removeLabel}
                  </Button>
                </div>
              ))}
            </section>
            <Field
              label={text(labels, "cwdLabel", "Working directory (optional)")}
              value={selection.cwd.value}
              placeholder={selection.cwd.placeholder}
              help={selection.cwd.help}
              testId="mcp-editor-cwd"
              onInput={(value) => handlers.patchMcpDraft({ cwd: value })}
            />
            <section class="zs-stack">
              <div class="zs-row zs-spread">
                <strong>{selection.envLabel}</strong>
                <Button
                  labels={labels}
                  small
                  testId="mcp-editor-add-env"
                  onClick={() => handlers.mcpEntry("env", { type: "add" })}
                >
                  {selection.addEnvLabel}
                </Button>
              </div>
              <BindingEditor
                entries={selection.env}
                labels={labels}
                testIdPrefix="mcp-env"
                onField={(id, field) =>
                  handlers.mcpEntry("env", {
                    type: "patch",
                    id,
                    patch: { field },
                  })
                }
                onValue={(id, value) =>
                  handlers.mcpEntry("env", {
                    type: "patch",
                    id,
                    patch: { value },
                  })
                }
                onRemove={(id) =>
                  handlers.mcpEntry("env", { type: "remove", id })
                }
              />
            </section>
          </>
        )}
        {!isStdio && (
          <>
            {selection.localApproval && (
              <Banner tone="warning" testId="mcp-editor-local">
                <Switch
                  checked={selection.localApproval.checked}
                  ariaLabel={selection.localApproval.label}
                  onChange={(checked) =>
                    handlers.patchMcpDraft({ localApproved: checked })
                  }
                >
                  {selection.localApproval.label}
                </Switch>
                <p>{selection.localApproval.address}</p>
              </Banner>
            )}
            <label class="zs-field">
              <span>{selection.auth.headerLabel}</span>
              <Choice
                label={selection.auth.headerLabel}
                value={selection.auth.value}
                options={selection.auth.options}
                testId="mcp-editor-auth"
                onChange={(value) =>
                  handlers.patchMcpDraft({ authKind: value })
                }
              />
            </label>
            {selection.auth.apiType && (
              <>
                <label class="zs-field">
                  <span>{text(labels, "apiKeyType", "API key type")}</span>
                  <Choice
                    label={text(labels, "apiKeyType", "API key type")}
                    value={selection.auth.apiType.value}
                    options={selection.auth.apiType.options}
                    testId="mcp-editor-api-type"
                    onChange={(value) =>
                      handlers.patchMcpDraft({
                        authField: value === "custom" ? "" : value,
                      })
                    }
                  />
                </label>
                {selection.auth.apiType.customField && (
                  <Field
                    label={selection.auth.apiType.customField.label}
                    value={selection.auth.apiType.customField.value}
                    placeholder={selection.auth.apiType.customField.placeholder}
                    testId="mcp-editor-api-field"
                    onInput={(value) =>
                      handlers.patchMcpDraft({ authField: value })
                    }
                  />
                )}
              </>
            )}
            {selection.auth.secret && (
              <Field
                label={selection.auth.secret.label}
                type="password"
                value={selection.auth.secret.value}
                placeholder={selection.auth.secret.placeholder}
                help={selection.auth.secret.help}
                testId="mcp-editor-secret"
                onInput={(value) => handlers.patchMcpDraft({ secret: value })}
              />
            )}
            <details
              class="zs-advanced"
              open={selection.headersOpen}
              data-testid="mcp-editor-advanced"
            >
              <summary>
                {text(
                  labels,
                  "advancedHeaders",
                  "Advanced: extra request headers",
                )}
              </summary>
              <div class="zs-stack">
                <div class="zs-row zs-spread">
                  <strong>{selection.headersLabel}</strong>
                  <Button
                    labels={labels}
                    small
                    testId="mcp-editor-add-header"
                    onClick={() =>
                      handlers.mcpEntry("headers", { type: "add" })
                    }
                  >
                    {selection.addHeaderLabel}
                  </Button>
                </div>
                <BindingEditor
                  entries={selection.headers}
                  labels={labels}
                  testIdPrefix="mcp-header"
                  onField={(id, field) =>
                    handlers.mcpEntry("headers", {
                      type: "patch",
                      id,
                      patch: { field },
                    })
                  }
                  onValue={(id, value) =>
                    handlers.mcpEntry("headers", {
                      type: "patch",
                      id,
                      patch: { value },
                    })
                  }
                  onRemove={(id) =>
                    handlers.mcpEntry("headers", { type: "remove", id })
                  }
                />
              </div>
            </details>
          </>
        )}
        {selection.problem && (
          <Banner tone="warning" testId="mcp-editor-problem">
            {selection.problem}
          </Banner>
        )}
        <Banner>{selection.hint}</Banner>
        {selection.failure && (
          <Banner tone="warning" testId="mcp-editor-failure">
            {selection.failure}
          </Banner>
        )}
      </fieldset>
    </Modal>
  );
}

function McpJsonDialog(props: {
  selection: McpJsonSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  return (
    <Modal
      title={selection.title}
      wide
      testId="mcp-json"
      footer={
        <div class="zs-row">
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="mcp-json-cancel"
            onClick={() => handlers.cancelDialog()}
          >
            {selection.cancelLabel}
          </Button>
          {!selection.readOnly && (
            <Button
              labels={labels}
              primary
              disabled={!selection.canSave || selection.pending}
              testId="mcp-json-save"
              onClick={() => handlers.saveMcpJson()}
            >
              {selection.saveLabel}
            </Button>
          )}
        </div>
      }
    >
      <div class="zs-stack">
        <p class="muted">{selection.description}</p>
        <TextArea
          label="mcpServers JSON"
          value={selection.value}
          readOnly={selection.readOnly}
          rows={12}
          testId="mcp-json-text"
          onInput={(value) => handlers.patchMcpJsonDraft({ text: value })}
        />
        {selection.conflictIds.length > 0 && (
          <Banner testId="mcp-json-conflicts">
            {text(
              labels,
              "jsonConflicts",
              "Same-name sources keep the saved configuration unless you replace them.",
            )}
          </Banner>
        )}
        {selection.summary && (
          <Banner testId="mcp-json-summary">{selection.summary}</Banner>
        )}
        {selection.problems.map((problem) => (
          <Banner
            key={problem.sourceId + "/" + problem.field}
            tone="warning"
            testId={"mcp-json-problem-" + problem.sourceId}
          >
            {problem.sourceId} · {problem.field} · {problem.code}
          </Banner>
        ))}
        {selection.failure && (
          <Banner tone="warning" testId="mcp-json-failure">
            {selection.failure}
          </Banner>
        )}
      </div>
    </Modal>
  );
}

function WebEditorDialog(props: {
  selection: WebEditorSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  return (
    <Modal
      title={selection.title}
      testId="web-editor"
      footer={
        <div class="zs-row">
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="web-editor-cancel"
            onClick={() => handlers.cancelDialog()}
          >
            {selection.cancelLabel}
          </Button>
          <Button
            labels={labels}
            primary
            disabled={!selection.canSave || selection.pending}
            testId="web-editor-save"
            onClick={() => handlers.saveWebDraft()}
          >
            {selection.saveLabel}
          </Button>
        </div>
      }
    >
      <fieldset class="zs-fields" disabled={selection.pending}>
        {selection.note && <Banner>{selection.note}</Banner>}
        {selection.connection && (
          <>
            <label class="zs-field">
              <span>{selection.connection.label}</span>
              <Choice
                label={selection.connection.label}
                value={selection.connection.value}
                options={selection.connection.options}
                testId="web-editor-connection"
                onChange={(value) =>
                  handlers.patchWebDraft({
                    modelConfigurationId: value,
                    searchModelId: "",
                  })
                }
              />
            </label>
            {selection.connection.emptyHint && (
              <Banner testId="web-editor-no-connection">
                {selection.connection.emptyHint}
              </Banner>
            )}
          </>
        )}
        {selection.model && (
          <label class="zs-field">
            <span>{selection.model.label}</span>
            <Choice
              label={selection.model.label}
              value={selection.model.value}
              options={selection.model.options}
              testId="web-editor-model"
              onChange={(value) =>
                handlers.patchWebDraft({ searchModelId: value })
              }
            />
          </label>
        )}
        {selection.endpoint && (
          <Field
            label={selection.endpoint.label}
            value={selection.endpoint.value}
            testId="web-editor-endpoint"
            onInput={(value) =>
              handlers.patchWebDraft({ endpoint: value, localApproved: false })
            }
          />
        )}
        {selection.localApproval && (
          <Banner tone="warning" testId="web-editor-local">
            <Switch
              checked={selection.localApproval.checked}
              ariaLabel={selection.localApproval.label}
              onChange={(checked) =>
                handlers.patchWebDraft({ localApproved: checked })
              }
            >
              {selection.localApproval.label}
            </Switch>
            <p>{selection.localApproval.address}</p>
          </Banner>
        )}
        {selection.executable && (
          <Field
            label={selection.executable.label}
            value={selection.executable.value}
            testId="web-editor-executable"
            onInput={(value) => handlers.patchWebDraft({ executable: value })}
          />
        )}
        {selection.args && (
          <TextArea
            label={selection.args.label}
            value={selection.args.value}
            rows={2}
            testId="web-editor-args"
            onInput={(value) => handlers.patchWebDraft({ args: value })}
          />
        )}
        {selection.args?.invalid && (
          <Banner tone="warning" testId="web-editor-args-invalid">
            {text(
              labels,
              "argsInvalid",
              "Arguments must be a JSON array of strings.",
            )}
          </Banner>
        )}
        {selection.secret && (
          <Field
            label={selection.secret.label}
            type="password"
            value={selection.secret.value}
            placeholder={selection.secret.placeholder}
            help={selection.secret.help}
            testId="web-editor-secret"
            onInput={(value) => handlers.patchWebDraft({ secret: value })}
          />
        )}
        {selection.billable && (
          <Banner tone="warning" testId="web-editor-billable">
            {text(
              labels,
              "billableNote",
              "Enabling this source may produce provider charges.",
            )}
          </Banner>
        )}
        <Banner>{selection.hint}</Banner>
        {selection.failure && (
          <Banner tone="warning" testId="web-editor-failure">
            {selection.failure}
          </Banner>
        )}
      </fieldset>
    </Modal>
  );
}

function ConfirmDialog(props: {
  selection: ConfirmSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  return (
    <Modal
      title={selection.title}
      testId="confirm-dialog"
      footer={
        <div class="zs-row">
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="confirm-cancel"
            onClick={() => handlers.cancelDialog()}
          >
            {selection.cancelLabel}
          </Button>
          <Button
            labels={labels}
            danger={selection.danger}
            disabled={selection.pending}
            testId="confirm-accept"
            onClick={() => handlers.confirmDialog()}
          >
            {selection.confirmLabel}
          </Button>
        </div>
      }
    >
      {selection.body.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {selection.list.length > 0 && (
        <ul class="zs-effect-list" data-testid="confirm-effects">
          {selection.list.map((effect) => (
            <li key={effect}>{effect}</li>
          ))}
        </ul>
      )}
      {selection.emptyList && (
        <p class="muted" data-testid="confirm-empty-effects">
          {selection.emptyList}
        </p>
      )}
    </Modal>
  );
}

function TestDialog(props: {
  selection: TestConfirmSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  return (
    <Modal
      title={selection.title}
      testId="test-dialog"
      footer={
        <div class="zs-row">
          <Button
            labels={labels}
            testId="test-cancel"
            onClick={() => handlers.cancelDialog()}
          >
            {selection.cancelLabel}
          </Button>
          <Button
            labels={labels}
            primary
            testId="test-send"
            onClick={() => handlers.runModelTest(true)}
          >
            {selection.confirmLabel}
          </Button>
        </div>
      }
    >
      <strong>{selection.subject}</strong>
      <p>{selection.description}</p>
      {selection.usageWarning && (
        <Banner tone="warning" testId="test-usage-warning">
          {selection.usageWarning}
        </Banner>
      )}
    </Modal>
  );
}

function LeaveDialog(props: {
  selection: LeaveSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  return (
    <Modal
      title={selection.title}
      testId="leave-dialog"
      footer={
        <div class="zs-row">
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="leave-continue"
            onClick={() => handlers.resolveLeave("continue")}
          >
            {selection.continueLabel}
          </Button>
          <Button
            labels={labels}
            disabled={selection.pending}
            testId="leave-discard"
            onClick={() => handlers.resolveLeave("discard")}
          >
            {selection.discardLabel}
          </Button>
          <Button
            labels={labels}
            primary
            disabled={!selection.canSave || selection.pending}
            testId="leave-save"
            onClick={() => handlers.resolveLeave("save")}
          >
            {selection.saveLabel}
          </Button>
        </div>
      }
    >
      <p>{selection.body}</p>
      {selection.pending && (
        <p role="status">{text(labels, "saving", "Saving...")}</p>
      )}
      {selection.failure && (
        <Banner tone="warning" testId="leave-failure">
          {selection.failure}
        </Banner>
      )}
    </Modal>
  );
}

function ModelPickerDialog(props: {
  selection: ModelPickerSelection;
  labels: SettingsLabels;
  handlers: ZoteroAgentSettingsHandlers;
}) {
  const { selection, labels, handlers } = props;
  return (
    <Modal
      title={selection.title}
      wide
      testId="model-picker"
      footer={
        <Button
          labels={labels}
          testId="model-picker-close"
          onClick={() => handlers.cancelDialog()}
        >
          {selection.closeLabel}
        </Button>
      }
    >
      <div class="zs-stack">
        <p class="muted">{selection.counts}</p>
        <Field
          label={text(labels, "searchModels", "Search models")}
          value={selection.query}
          testId="model-picker-query"
          onInput={(value) => handlers.setModelPickerQuery(value)}
        />
        {selection.models.map((model) => (
          <div class="zs-model-row" key={model.key}>
            <div>
              <strong>{model.name}</strong>
              <small class="muted">{model.detail}</small>
            </div>
            <Button
              labels={labels}
              small
              disabled={model.addDisabled}
              testId={"picker-add-" + model.key}
              onClick={() =>
                handlers.addModelFromPicker(
                  model.key.split("/")[1] || model.key,
                )
              }
            >
              {model.addLabel}
            </Button>
          </div>
        ))}
        {selection.emptyHint && (
          <small class="muted">{selection.emptyHint}</small>
        )}
        {selection.pending && (
          <p role="status" class="muted" data-testid="model-picker-pending">
            {text(labels, "addingModel", "Adding the model...")}
          </p>
        )}
        {selection.failure && (
          <Banner tone="warning" testId="model-picker-failure">
            {selection.failure}
          </Banner>
        )}
      </div>
    </Modal>
  );
}

export const DialogRegion = memo(
  function DialogRegion(props: {
    view: ZoteroAgentSettingsView;
    handlers: ZoteroAgentSettingsHandlers;
  }) {
    const dialog = props.view.dialog;
    const guard = props.view.leave;
    const labels = props.view.nav.page ? labelsOf(props.view) : {};
    const editor = renderDialog(dialog, labels, props.handlers);
    // The stack wrapper is always present, even when it holds nothing. It is
    // what keeps the editor at the same position in the tree: adding the guard
    // then only adds a sibling, so the guarded form is never unmounted and its
    // inputs keep their DOM identity, focus, selection and caret.
    return (
      <div class={"zs-dialog-stack" + (editor || guard ? "" : " is-empty")}>
        {editor}
        {guard && (
          <LeaveDialog
            selection={guard.value}
            labels={labels}
            handlers={props.handlers}
          />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.handlers === next.handlers &&
    equalBySignature(prev.view.dialog, next.view.dialog) &&
    equalBySignature(prev.view.leave, next.view.leave),
);

function renderDialog(
  dialog: ZoteroAgentSettingsView["dialog"],
  labels: SettingsLabels,
  handlers: ZoteroAgentSettingsHandlers,
) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case "connection-editor":
      return (
        <ConnectionEditorDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    case "mcp-editor":
      return (
        <McpEditorDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    case "mcp-json":
      return (
        <McpJsonDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    case "web-editor":
      return (
        <WebEditorDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    case "confirm":
      return (
        <ConfirmDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    case "test":
      return (
        <TestDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    case "model-picker":
      return (
        <ModelPickerDialog
          selection={dialog.value}
          labels={labels}
          handlers={handlers}
        />
      );
    default:
      return null;
  }
}

function labelsOf(view: ZoteroAgentSettingsView): SettingsLabels {
  return (
    view.workbench?.labels ||
    view.mcp?.labels ||
    view.search?.labels ||
    view.catalog?.labels ||
    {}
  );
}

export type { PurposeKey, Badge };
