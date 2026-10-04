import * as providers from "../../piProviderConfiguration";
import * as credentials from "../../piCredentialStore";
import * as auth from "../../piChatGPTAuth";
import * as mcp from "../../piMcpSourceRegistry";
import * as web from "../../piBrokeredWebTools";
import * as catalogOwner from "../../piModelCatalog";
import { openRuntimeFilePicker } from "../../../platform/filePicker";
import type { PiCatalog } from "../../../shared/piProviderContract";
import type {
  ZoteroAgentSettingsSnapshot,
  ZoteroAgentSettingsModelsQuery,
} from "../../../shared/zoteroAgentSettingsWireContract";
import { PI_WEB_SOURCE_BILLABLE } from "../../../shared/piWebSourceContract";
import { getPiProviderConnectionSupport } from "../../piProviderExecution";
import { classifyPiOutboundUrl } from "../../piOutboundNetworkPolicy";
import { buildZoteroAgentSettingsLabels } from "./zoteroAgentSettingsLabels";

type Request = {
  action: string;
  requestId: string;
  objectId: string;
  payload: Record<string, unknown>;
};

/** The only lazy settings composition point; durable facts stay with their owners. */
export async function createZoteroAgentSettingsOwner(
  options: {
    progress?(payload: {
      requestId: string;
      objectId: string;
      phase: "waiting" | "exchange" | "verify";
    }): void;
    authorizeLocalNetwork?(endpoint: string): Promise<boolean>;
  } = {},
) {
  let closed = false;
  let catalog: PiCatalog = await catalogOwner.loadPiModelCatalog();
  const subscriptions = new Set<() => void>();
  const logins = new Map<string, string>();
  let revision = 0;
  let models: ZoteroAgentSettingsModelsQuery = {
    models: [],
    total: 0,
    offset: 0,
    pageSize: 50,
    query: "",
  };
  const publish = () => {
    if (!closed) for (const listener of subscriptions) listener();
  };
  const unsubscribeCatalog = catalogOwner.subscribePiModelCatalog((next) => {
    catalog = next;
    publish();
  });
  const unsubscribeAuth = auth.subscribePiChatGPTRegistrations(() => publish());
  const unsubscribeCredentials =
    credentials.subscribePiCredentialIdentityChange(() => publish());
  function subscribe(listener: () => void) {
    subscriptions.add(listener);
    return () => subscriptions.delete(listener);
  }
  async function snapshot(): Promise<ZoteroAgentSettingsSnapshot> {
    const state = providers.loadPiProviderConfigurationState();
    const savedCredentials = credentials.listPiCredentials();
    const registrations = auth.listPiChatGPTRegistrations();
    const identity = (id: string) =>
      credentials.getPiCredentialIdentityRevision(id, "model-provider") ||
      undefined;
    return {
      revision: String(++revision),
      state: {
        connections: state.connections.map((connection) => {
          const registration = registrations.find(
            (entry) => entry.id === connection.credentialRef,
          );
          const credential = savedCredentials.find(
            (entry) =>
              entry.id === connection.credentialRef &&
              entry.kind === connection.authVariant,
          );
          const discovery =
            catalog.state?.accounts?.[connection.credentialRef || ""];
          const discovered = catalog.models.some(
            (model) =>
              model.source === "discovered" &&
              model.credentialRef === connection.credentialRef,
          );
          const ready =
            connection.enabled &&
            !connection.repairRequired &&
            (connection.authVariant === "none" ||
              (connection.authVariant === "chatgpt"
                ? !!registration?.signedIn &&
                  registration.planEnabled &&
                  registration.welcomeAccepted &&
                  !registration.reauthorizationRequired &&
                  !registration.paused
                : !!credential));
          return {
            ...connection,
            kind:
              connection.authVariant === "chatgpt"
                ? "chatgpt"
                : connection.baseUrl
                  ? "custom"
                  : "api-key",
            registrationId:
              connection.authVariant === "chatgpt"
                ? connection.credentialRef
                : undefined,
            credentialMasked: credential?.masked,
            localNetworkApproved: !!connection.localNetworkApprovedOrigin,
            availability: {
              ready,
              code: ready
                ? "ready"
                : !connection.enabled
                  ? "disabled"
                  : "needs_configuration",
            },
            discovery: {
              status:
                discovery?.status === "checking" ||
                discovery?.status === "failed"
                  ? discovery.status
                  : discovery?.checkedAt
                    ? discovered
                      ? "ready"
                      : "empty"
                    : "idle",
              checkedAt: discovery?.checkedAt,
              code: discovery?.error,
              identity: identity(connection.credentialRef || ""),
            },
            modelCount: state.configurations.filter(
              (card) => card.connectionId === connection.id,
            ).length,
          };
        }),
        configurations: state.configurations.map((card) => {
          const connection = state.connections.find(
            (entry) => entry.id === card.connectionId,
          )!;
          const model = providers.findPiCatalogModel(
            catalog,
            connection,
            card.modelId,
          );
          const availability = providers.resolvePiModelAvailability({
            configurationId: card.id,
            catalog,
            credentials: savedCredentials,
          });
          return {
            ...card,
            provider: connection.provider,
            name: model?.name || card.modelId,
            baseUrl: connection.binding?.baseUrl || connection.baseUrl,
            api: connection.binding?.api || connection.api,
            reasoningLevels:
              model?.reasoning as import("../../../shared/piProviderContract").PiReasoningLevel[],
            availability,
            overlayApplied: model?.source === "overlay",
            bindingIdentity: JSON.stringify([
              providers.piModelConfigurationBindingIdentity({
                configurationId: card.id,
                state,
              }),
              identity(connection.credentialRef || ""),
            ]),
          };
        }),
        defaults: state.defaults,
        overlayPath: state.overlayPath.split(/[\\/]/).pop() || "",
      },
      credentials: savedCredentials,
      registrations: registrations.map((entry) => ({
        ...entry,
        identity: identity(entry.id),
      })),
      mcpSources: mcp.loadPiMcpSourceRegistry().sources,
      mcpTestIdentity: Object.fromEntries(
        mcp
          .loadPiMcpSourceRegistry()
          .sources.map((source) => [
            source.id,
            mcp.piMcpSourceBindingIdentity(source),
          ]),
      ),
      mcpCredentials: credentials.listPiCredentials("mcp-source"),
      webSources: web
        .getPiBrokeredWebTools()
        .listSources()
        .map((source) => {
          const description = web
            .getPiBrokeredWebTools()
            .describeSavedSource(source.id);
          return {
            ...source,
            configured: description?.missing.length === 0,
            missing: description?.missing || ["source_unavailable"],
            billable: PI_WEB_SOURCE_BILLABLE.has(source.kind),
            credentialMasked: credentials
              .listPiCredentials("web-source")
              .find((entry) => entry.id === source.credentialId)?.masked,
            localNetworkApproved: !!source.localNetworkApprovedOrigin,
            bindingIdentity: description?.identity,
          };
        }),
      webCredentials: credentials.listPiCredentials("web-source"),
      catalog: {
        status: "ready",
        revision: catalog.revision,
        modelCount: catalog.models.length,
        providers: [...new Set(catalog.models.map((model) => model.provider))]
          .sort()
          .map((provider) => {
            const entries = catalog.models.filter(
              (model) => model.provider === provider,
            );
            const supported = entries.some(
              (model) =>
                getPiProviderConnectionSupport({
                  provider,
                  api: model.api,
                  baseUrl: model.baseUrl,
                  authVariant: "api-key",
                }).supported,
            );
            return {
              id: provider,
              label: provider,
              modelCount: entries.length,
              configurable: supported,
              requiresParameters: false,
              ...(!supported
                ? { unavailableReason: "unsupported_request" as const }
                : {}),
            };
          }),
        state: catalog.state,
        overlayLabel: state.overlayPath.split(/[\\/]/).pop() || undefined,
      },
      models,
      labels: buildZoteroAgentSettingsLabels(),
    };
  }
  async function dispatch(
    request: Request,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    if (closed || signal.aborted) return { ok: false, code: "canceled" };
    const { action, payload, requestId } = request;
    if (action === "pi-upsert-configuration") {
      const raw =
        payload.connection as import("../../../shared/zoteroAgentSettingsWireContract").ZoteroAgentSettingsConnectionInput;
      const previous = providers
        .loadPiProviderConfigurationState()
        .connections.find((entry) => entry.id === raw.id);
      const connection = {
        id: raw.id,
        label: raw.label,
        provider: raw.provider,
        authVariant: raw.authVariant,
        credentialRef:
          raw.authVariant === "chatgpt"
            ? raw.registrationId
            : raw.authVariant === "none"
              ? undefined
              : String(
                  payload.credentialRef ||
                    previous?.credentialRef ||
                    `provider-${raw.id}`,
                ),
        enabled: raw.enabled,
        baseUrl: raw.baseUrl,
        api: raw.api,
        requiresLocalNetwork: raw.requiresLocalNetwork,
        localNetworkApprovedOrigin:
          raw.acceptLocalNetwork && raw.baseUrl
            ? new URL(raw.baseUrl).origin
            : previous?.localNetworkApprovedOrigin,
      };
      await providers.savePiProviderConnection({
        connection,
        catalog,
        ...(typeof payload.secret === "string" && payload.secret
          ? { secret: payload.secret }
          : {}),
        signal,
      });
    } else if (action === "pi-delete-configuration")
      return {
        ok: true,
        result: {
          impact: await providers.removePiProviderConnection(request.objectId),
        },
      };
    else if (action === "pi-upsert-model") {
      const state = providers.loadPiProviderConfigurationState();
      // Adding names the connection that receives the card; editing names the
      // card itself. Neither is read from the object identity, so a card ID and
      // a connection ID that happen to collide can never make a save rewrite an
      // unrelated card.
      const configurationId = String(payload.configurationId || "");
      const connectionId = String(payload.connectionId || "");
      if (configurationId && connectionId)
        return { ok: false, code: "invalid_model_target" };
      const existing = configurationId
        ? state.configurations.find((entry) => entry.id === configurationId)
        : undefined;
      if (configurationId && !existing)
        return { ok: false, code: "model_not_found" };
      const target = state.connections.find(
        (entry) => entry.id === (existing?.connectionId || connectionId),
      );
      if (!target) return { ok: false, code: "connection_not_found" };
      providers.upsertPiModelConfiguration(
        {
          id: existing?.id || `model-${globalThis.crypto.randomUUID()}`,
          connectionId: target.id,
          modelId: String(payload.modelId || existing?.modelId || ""),
          enabled:
            typeof payload.enabled === "boolean"
              ? payload.enabled
              : (existing?.enabled ?? true),
          reasoning:
            (payload.reasoning as import("../../../shared/piProviderContract").PiReasoningLevel) ||
            existing?.reasoning ||
            "off",
        },
        catalog,
      );
    } else if (action === "pi-remove-model")
      providers.removePiModelConfiguration(request.objectId);
    else if (action === "pi-set-defaults") {
      const defaults = {
        ...providers.loadPiProviderConfigurationState().defaults,
      };
      const purpose = payload.purpose as keyof typeof defaults;
      if (
        !["global", "conversation", "skillRun", "auxiliary"].includes(purpose)
      )
        return { ok: false, code: "invalid_default_purpose" };
      if (payload.configurationId)
        defaults[purpose] = {
          configurationId: String(payload.configurationId),
        };
      else delete defaults[purpose];
      providers.setPiProviderDefaults(
        defaults,
        credentials.listPiCredentials(),
        catalog,
      );
    } else if (
      action === "pi-put-credential" ||
      action === "pi-web-put-secret"
    ) {
      await credentials.putPiCredential({
        id: String(payload.reuseId || request.objectId),
        label: String(payload.label || ""),
        namespace:
          action === "pi-put-credential" ? "model-provider" : "web-source",
        material: {
          kind: action === "pi-put-credential" ? "api-key" : "web-secret",
          secret: String(payload.secret || ""),
        },
      });
    } else if (action === "pi-delete-credential")
      await credentials.deletePiCredential(request.objectId);
    else if (action === "pi-catalog-query") {
      const provider = String(payload.provider || "").slice(0, 128);
      const query = String(payload.query || "")
        .slice(0, 128)
        .toLowerCase();
      const connection = providers
        .loadPiProviderConfigurationState()
        .connections.find((entry) => entry.id === request.objectId);
      const registration =
        connection?.authVariant === "chatgpt"
          ? connection.credentialRef || ""
          : "";
      const chatgpt = auth
        .listPiChatGPTRegistrations()
        .some((entry) => entry.id === registration);
      const filtered = catalog.models.filter(
        (model) =>
          (!provider || model.provider === provider) &&
          (!chatgpt ||
            (model.source === "discovered" &&
              model.credentialRef === registration)) &&
          (!query ||
            model.id.toLowerCase().includes(query) ||
            model.name.toLowerCase().includes(query)),
      );
      const offset = Math.max(
        0,
        Math.min(filtered.length, Number(payload.offset) || 0),
      );
      models = {
        models: filtered.slice(offset, offset + 50).map((model) => {
          const support = getPiProviderConnectionSupport({
            provider: model.provider,
            api: model.api,
            baseUrl:
              connection?.binding?.baseUrl ||
              connection?.baseUrl ||
              model.baseUrl,
            authVariant: connection?.authVariant || "api-key",
          });
          return {
            ...model,
            configurable: support.supported,
            ...(!support.supported ? { reason: "unsupported_request" } : {}),
          };
        }),
        total: filtered.length,
        offset,
        pageSize: 50,
        query,
        provider,
        requestId,
      };
      return {
        ok: true,
        result: { total: filtered.length, offset, pageSize: 50 },
      };
    } else if (action === "pi-catalog-refresh-public") {
      catalog = await catalogOwner.refreshPiPublicModelCatalog({ signal });
      return {
        ok: catalog.state?.status !== "failed",
        ...(catalog.state?.error ? { code: catalog.state.error } : {}),
      };
    } else if (action === "pi-catalog-set-auto-update")
      catalog = await catalogOwner.setPiModelCatalogAutoUpdate(
        payload.enabled === true,
      );
    else if (action === "pi-catalog-restore-previous")
      catalog = await catalogOwner.restorePiPreviousModelCatalog();
    else if (action === "pi-catalog-remove-overlay")
      catalog = await catalogOwner.removePiModelOverlay();
    else if (
      action === "pi-refresh-overlay" ||
      action === "pi-select-overlay-file"
    ) {
      const picked =
        action === "pi-select-overlay-file"
          ? await openRuntimeFilePicker({
              mode: "open",
              title: "Model information",
              filters: [["JSON", "*.json"]],
            })
          : providers.loadPiProviderConfigurationState().overlayPath;
      if (typeof picked !== "string" || !picked)
        return { ok: true, result: { canceled: true } };
      const previous = catalog;
      catalog = await catalogOwner.refreshPiModelCatalog({
        overlayPath: picked,
        signal,
      });
      providers.setPiOverlayPath(picked);
      const before = new Map(
        previous.models.map((model) => [
          model.provider + "\n" + model.id,
          JSON.stringify(model),
        ]),
      );
      let added = 0,
        changed = 0;
      for (const model of catalog.models) {
        const old = before.get(model.provider + "\n" + model.id);
        if (!old) added++;
        else if (old !== JSON.stringify(model)) changed++;
      }
      return {
        ok: true,
        result: { added, changed, label: picked.split(/[\\/]/).pop() },
      };
    } else if (action === "pi-chatgpt-connect") {
      const registrationId =
        String(payload.registrationId || "") ||
        `chatgpt-${globalThis.crypto.randomUUID()}`;
      if (logins.has(registrationId))
        return { ok: false, code: "login_active" };
      logins.set(registrationId, requestId);
      const cancel = () => void auth.cancelPiChatGPTLogin(requestId);
      signal.addEventListener("abort", cancel, { once: true });
      try {
        const metadata = await auth.connectPiChatGPT({
          id: registrationId,
          label: String(payload.label || "ChatGPT"),
          requestId,
          signal,
          reconsent: payload.reconsent === true,
          onProgress: (progress) => {
            if (!closed && !signal.aborted)
              options.progress?.({
                requestId,
                objectId: request.objectId,
                phase:
                  progress.status === "waiting_browser"
                    ? "waiting"
                    : progress.status === "exchanging"
                      ? "exchange"
                      : "verify",
              });
          },
        });
        if (!closed && !signal.aborted) {
          // Login has settled independently of discovery. Failed discovery
          // keeps the registration and its adopted same-identity facts.
          try {
            catalog = await catalogOwner.refreshPiChatGPTModelCatalog(catalog, {
              credentialId: metadata.id,
              signal,
            });
          } catch {
            catalog = await catalogOwner.loadPiModelCatalog();
          }
          if (closed || signal.aborted) return { ok: false, code: "canceled" };
          return {
            ok: true,
            result: { registrationId: metadata.id, status: "complete" },
          };
        }
        return { ok: false, code: "canceled" };
      } finally {
        signal.removeEventListener("abort", cancel);
        logins.delete(registrationId);
      }
    } else if (action === "pi-chatgpt-cancel")
      await auth.cancelPiChatGPTLogin(request.objectId);
    else if (action === "pi-chatgpt-accept-welcome")
      await auth.acceptPiChatGPTWelcome(request.objectId);
    else if (action === "pi-chatgpt-usage") {
      if (
        !auth
          .listPiChatGPTRegistrations()
          .some((entry) => entry.id === request.objectId)
      )
        return { ok: false, code: "credential_missing" };
      (
        globalThis as { Zotero?: { launchURL(url: string): void } }
      ).Zotero?.launchURL("https://chatgpt.com/settings/usage");
      return { ok: true, result: { opened: true } };
    } else if (action === "pi-chatgpt-sign-out") {
      const id = request.objectId;
      await auth.signOutPiChatGPT(
        id,
        payload.remove === true ? { remove: true } : undefined,
      );
      catalog = await catalogOwner.removePiChatGPTCredentialModels(catalog, id);
    } else if (action === "pi-chatgpt-refresh-models") {
      const connection = providers
        .loadPiProviderConfigurationState()
        .connections.find((entry) => entry.id === request.objectId);
      const id = String(
        payload.registrationId || connection?.credentialRef || request.objectId,
      );
      if (!auth.listPiChatGPTRegistrations().some((entry) => entry.id === id))
        return { ok: false, code: "credential_missing" };
      catalog = await catalogOwner.refreshPiChatGPTModelCatalog(catalog, {
        credentialId: id,
        signal,
      });
    } else if (action === "pi-mcp-upsert-source") {
      const source =
        payload.source as import("../../../shared/piMcpSourceContract").PiMcpSourceInput;
      await mcp.applyPiMcpSourceChange({
        sources: [source],
        conflicts: { [source.id]: "replace" },
      });
      await (
        await import("../../piMcpRuntimeOwner")
      ).disconnectPiMcpSource(source.id);
    } else if (action === "pi-mcp-delete-source") {
      await mcp.applyPiMcpSourceChange({
        sources: [],
        removals: [request.objectId],
      });
      await (
        await import("../../piMcpRuntimeOwner")
      ).disconnectPiMcpSource(request.objectId);
    } else if (action === "pi-mcp-test-source") {
      const source = mcp
        .loadPiMcpSourceRegistry()
        .sources.find((entry) => entry.id === request.objectId);
      if (!source) return { ok: false, code: "mcp_source_missing" };
      const sourceIdentity = mcp.piMcpSourceBindingIdentity(source);
      const owner = await (
        await import("../../piMcpRuntimeOwner")
      ).getPiMcpToolSources();
      const tools = await owner.testSource(request.objectId, signal);
      const current = mcp
        .loadPiMcpSourceRegistry()
        .sources.find((entry) => entry.id === request.objectId);
      if (
        signal.aborted ||
        !current ||
        mcp.piMcpSourceBindingIdentity(current) !== sourceIdentity
      )
        return { ok: false, code: "mcp_source_changed" };
      return {
        ok: true,
        result: {
          status: "available",
          toolCount: tools.length,
          bindingIdentity: sourceIdentity,
        },
      };
    } else if (action === "pi-mcp-export")
      return { ok: true, result: { document: mcp.exportPiMcpJson() } };
    else if (action === "pi-mcp-preview-import" || action === "pi-mcp-import") {
      const preview = mcp.previewPiMcpJson(String(payload.json || ""), {
        mode: payload.mode === "edit" ? "replace" : "merge",
      });
      const conflicts =
        payload.mode === "edit"
          ? Object.fromEntries(
              preview.change.sources.map((source) => [
                source.id,
                "replace" as const,
              ]),
            )
          : (payload.conflicts as
              | Record<string, "keep" | "replace">
              | undefined);
      const approvals = Array.isArray(payload.approvals)
        ? (payload.approvals as Array<{
            sourceId: string;
            localNetwork?: boolean;
            cleartext?: boolean;
          }>)
        : [];
      const change = {
        ...preview.change,
        expectedRevision:
          typeof payload.expectedRevision === "string"
            ? payload.expectedRevision
            : undefined,
        conflicts,
        sources: preview.change.sources.map((source) => {
          const approval = approvals.find(
            (entry) => entry.sourceId === source.id,
          );
          return {
            ...source,
            approveLocalNetwork: approval?.localNetwork === true,
            approveCleartext: approval?.cleartext === true,
          };
        }),
      };
      const plan = mcp.preparePiMcpChange(change);
      const prior = mcp.loadPiMcpSourceRegistry().sources;
      const added = plan.next.filter(
        (source) => !prior.some((entry) => entry.id === source.id),
      ).length;
      const changed = plan.next.filter((source) =>
        prior.some(
          (entry) =>
            entry.id === source.id &&
            JSON.stringify(entry) !== JSON.stringify(source),
        ),
      ).length;
      if (action === "pi-mcp-preview-import")
        return {
          ok: true,
          result: {
            preview: {
              revision: plan.revision,
              added,
              changed,
              removed: plan.removals.length,
              conflicts: preview.impact.conflicts.map((sourceId) => ({
                sourceId,
              })),
              grants: plan.approvalsRequired,
              secretSlots: preview.secrets.map(({ sourceId, field }) => ({
                sourceId,
                field,
              })),
              problems: [],
            },
          },
        };
      await mcp.commitPiMcpChange(plan);
      const runtime = await import("../../piMcpRuntimeOwner");
      for (const source of prior)
        if (
          plan.removals.includes(source.id) ||
          plan.next.some(
            (entry) =>
              entry.id === source.id &&
              JSON.stringify(entry) !== JSON.stringify(source),
          )
        )
          await runtime.disconnectPiMcpSource(source.id);
      return {
        ok: true,
        result: { added, changed, removed: plan.removals.length },
      };
    } else if (action === "pi-web-save-sources") {
      const inputs =
        payload.sources as import("../../../shared/zoteroAgentSettingsWireContract").ZoteroAgentSettingsWebSourceInput[];
      const previous = web.getPiBrokeredWebTools().listSources();
      const proposed = inputs.map((source) => ({
        id: source.id,
        kind: source.kind,
        label: source.label,
        enabled: source.enabled,
        credentialId: source.credentialId,
        modelConfigurationId: source.modelConfigurationId,
        searchModelId: source.searchModelId,
        endpoint: source.endpoint,
        executable: source.executable,
        args: source.args,
        codeExecutionApproved: source.codeExecutionApproved === true,
        localNetworkApprovedOrigin:
          source.localNetworkApproved && source.endpoint
            ? classifyPiOutboundUrl(source.endpoint).origin
            : undefined,
      }));
      const submission = payload.secret as
        | { sourceId: string; secret: string }
        | undefined;
      if (submission?.secret) {
        const source = proposed.find(
          (entry) => entry.id === submission.sourceId,
        );
        if (!source) return { ok: false, code: "source_unavailable" };
        source.credentialId ||= `search-${source.id}`;
        await credentials.commitPiCredentialChange({
          credential: {
            id: source.credentialId,
            namespace: "web-source",
            label: source.label,
            material: { kind: "web-secret", secret: submission.secret },
          },
          signal,
          apply: () => {
            if (
              JSON.stringify(web.getPiBrokeredWebTools().listSources()) !==
              JSON.stringify(previous)
            )
              throw new Error("Web source changed");
            web.getPiBrokeredWebTools().saveSources(proposed);
          },
        });
      } else web.getPiBrokeredWebTools().saveSources(proposed);
    } else if (action === "pi-web-test-source") {
      const source = web
        .getPiBrokeredWebTools()
        .listSources()
        .find((entry) => entry.id === request.objectId);
      if (
        source &&
        PI_WEB_SOURCE_BILLABLE.has(source.kind) &&
        payload.allowUsage !== true
      )
        return { ok: false, code: "usage_confirmation_required" };
      const result = await web
        .getPiBrokeredWebTools()
        .testSource(request.objectId, requestId, signal);
      return {
        ok: result.status === "available",
        code: result.code,
        result: { ...result, bindingIdentity: result.binding?.identity },
      };
    } else if (action === "pi-test-connection") {
      if (payload.allowUsage !== true)
        return { ok: false, code: "usage_confirmation_required" };
      const configurationId = String(
        payload.configurationId || request.objectId,
      );
      const selection = providers.resolvePiModelSelection({
        kind: "conversation",
        catalog,
        credentials: credentials.listPiCredentials(),
        explicit: { configurationId },
      });
      const bindingIdentity = JSON.stringify([
        providers.piModelConfigurationBindingIdentity({ configurationId }),
        credentials.getPiCredentialIdentityRevision(
          selection.credentialRef || "",
          "model-provider",
        ) || undefined,
      ]);
      const { createPiProviderModelSource } =
        await import("../../piProviderExecution");
      const { PiModelStreamFailure } = await import("../../piRuntime");
      const Controller = (
        await import("../../../utils/wait")
      ).resolveNativeAbortControllerConstructor();
      if (!Controller) return { ok: false, code: "provider_unavailable" };
      const controller = new Controller();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, 30_000);
      const perform = async (permit?: object) => {
        for await (const _ of createPiProviderModelSource(selection, {
          disableChatGPTRetries: true,
          chatGPTResumePermit: permit,
          authorizeLocalNetwork:
            options.authorizeLocalNetwork || (async () => false),
        })({
          systemPrompt: "",
          messages: [{ role: "user", text: "Reply OK." }],
          signal: controller.signal,
        })) {
          /* Provider source validates actual terminal completion. */
        }
        const currentIdentity = JSON.stringify([
          providers.piModelConfigurationBindingIdentity({ configurationId }),
          credentials.getPiCredentialIdentityRevision(
            selection.credentialRef || "",
            "model-provider",
          ) || undefined,
        ]);
        if (closed || signal.aborted || currentIdentity !== bindingIdentity)
          throw new PiModelStreamFailure("aborted");
      };
      const registration = auth
        .listPiChatGPTRegistrations()
        .find((entry) => entry.id === selection.credentialRef);
      try {
        if (selection.authVariant === "chatgpt" && registration?.paused)
          await auth.withPiChatGPTResumeProbe(registration.id, perform);
        else await perform();
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
      }
      return {
        ok: true,
        result: {
          completed: true,
          resumeLifted: registration?.paused === true,
          possibleUsage: true,
          bindingIdentity,
        },
      };
    } else if (action === "pi-export-diagnostics") {
      const target = await openRuntimeFilePicker({
        mode: "save",
        title: "Export diagnostics",
        suggestion: "pi-diagnostics.zip",
      });
      if (!target || typeof target !== "string" || closed || signal.aborted)
        return { ok: true, result: { canceled: true } };
      const { exportDiagnostics } = await import("../../piRuntimeAudit");
      const result = await exportDiagnostics({ kind: "global" }, target);
      return result.status === "exported"
        ? { ok: true }
        : { ok: false, code: result.code };
    } else {
      return { ok: false, code: "unknown_settings_action" };
    }
    return { ok: true };
  }
  function dispose() {
    if (closed) return;
    closed = true;
    for (const requestId of logins.values())
      void auth.cancelPiChatGPTLogin(requestId);
    logins.clear();
    unsubscribeCatalog();
    unsubscribeAuth();
    unsubscribeCredentials();
    subscriptions.clear();
  }
  return { snapshot, dispatch, subscribe, dispose };
}
