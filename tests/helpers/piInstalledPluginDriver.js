import { assert } from "chai";
import { getRuntimePersistencePaths, writeRuntimeTextFile, } from "../../src/modules/runtimePersistence";
import { inspectPiOwner } from "../../src/modules/piOwnerPersistence";
import { listPiSkillRunRegistry } from "../../src/modules/pluginStateStore";
import { getPref, setPref } from "../../src/utils/prefs";
import { joinNativePath } from "../../src/platform/path";
import { createPiCapacityFixture } from "./piCapacityWorkflowDriver";
import { readDiagnosticsEnv } from "../zotero/testDiagnosticsOutput";
/**
 * Opens the installed Assistant Workspace shell and returns a driver over its
 * public bridge. Publications are folded per owner so a concurrent foreground
 * load never reads another conversation's latest status.
 */
export async function openInstalledPiUi() {
    const win = Zotero.getMainWindow();
    await plugin().hooks.onPrefsEvent("toggleAssistantSidebar", { window: win });
    const shell = await until(() => shellWindow(win), "pi_xpi_shell_missing");
    const bridge = shell[BRIDGE] || shell.wrappedJSObject?.[BRIDGE];
    const owners = new Map();
    let selected;
    const observe = (event) => {
        const data = event.data;
        const publication = data?.payload?.publication;
        if (data?.type !== "assistant-workspace:child-publication" ||
            publication?.owner?.source !== "pi-conversations")
            return;
        // `ownerKey` is the single publication owner identity.
        const ownerKey = String(publication.owner?.ownerKey ?? "");
        if (!ownerKey)
            return;
        const entry = owners.get(ownerKey) ?? {
            owner: publication.owner,
            status: "",
            streamed: false,
            transcriptForms: {},
        };
        if (publication.publicationKind === "owner-navigation" &&
            publication.payload?.selectedOwner) {
            entry.owner = publication.payload.selectedOwner;
            selected = publication.payload.selectedOwner;
        }
        if (publication.publicationKind === "owner-control")
            entry.status = String(publication.payload.status ?? "");
        if (publication.publicationKind === "transcript") {
            const form = String(publication.publicationForm ?? "");
            entry.transcriptForms[form] = (entry.transcriptForms[form] || 0) + 1;
            if (form === "delta")
                entry.streamed = true;
        }
        owners.set(ownerKey, entry);
    };
    shell.addEventListener("message", observe);
    await bridge.postMessage("assistant-workspace:action", { action: "ready" });
    return {
        async action(action, payload, ownerRef) {
            const result = await bridge.postMessage("assistant-workspace:child-action", {
                source: "pi-conversations",
                actionId: `ui-${Date.now()}-${Math.random()}`,
                action,
                owner: ownerRef ?? null,
                payload,
            });
            assert.isTrue(result?.ok === true, `pi_ui_action_${action}_failed`);
        },
        observation(ownerId) {
            return owners.get(ownerId);
        },
        selectedOwner() {
            return selected;
        },
        shellWindow() {
            return shell;
        },
        close() {
            shell.removeEventListener("message", observe);
        },
    };
}
// Executes only UI actions on the installed plugin. Imports above prepare
// controlled files or read durable observations; they do not execute Pi owners.
const BRIDGE = "__zsAssistantWorkspaceBridge";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, code) {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        const value = await read();
        if (value !== undefined)
            return value;
        await delay(100);
    }
    throw new Error(code);
}
function plugin() {
    const installed = Zotero.ZoteroSkills;
    assert.isTrue(installed?.data?.initialized === true);
    return installed;
}
function frameWindow(frame) {
    return (frame.contentWindow || frame.contentDocument?.defaultView);
}
function shellWindow(win) {
    for (const frame of Array.from(win.document.querySelectorAll("browser,iframe"))) {
        const child = frameWindow(frame);
        if (child &&
            child.document.readyState === "complete" &&
            child.document.documentURI.includes("/sidebar/assistant-workspace.html") &&
            (child[BRIDGE] || child.wrappedJSObject?.[BRIDGE]))
            return child;
    }
    return undefined;
}
/** Controls the real Backend Manager message surface, without importing it. */
export async function installedBackendManager() {
    const win = Zotero.getMainWindow();
    // The dialog action resolves when it closes; observe it while it is open.
    let openFailure;
    void plugin()
        .hooks.onPrefsEvent("openBackendManager", { window: win })
        .catch((error) => {
        openFailure = error;
    });
    const dialog = (await until(() => {
        if (openFailure)
            throw openFailure;
        return plugin().data.dialog?.window;
    }, "pi_xpi_backend_dialog_missing"));
    const frame = await until(() => {
        const element = dialog.document.querySelector("browser,iframe");
        return element ? frameWindow(element) : undefined;
    }, "pi_xpi_backend_frame_missing");
    const results = new Map();
    let snapshot;
    const observe = (event) => {
        const envelope = event.data;
        if (envelope?.type === "backend-manager-dialog:action-result")
            results.set(envelope.payload.action, envelope.payload);
        if ([
            "backend-manager-dialog:init",
            "backend-manager-dialog:snapshot",
        ].includes(envelope?.type))
            snapshot = envelope.payload;
    };
    frame.addEventListener("message", observe);
    const send = (action, payload = {}) => {
        dialog.dispatchEvent(new dialog.MessageEvent("message", {
            source: frame,
            data: { type: "backend-manager-dialog:action", action, payload },
        }));
    };
    send("ready");
    await until(() => (snapshot?.rows ? snapshot : undefined), "pi_xpi_backend_snapshot_missing");
    return {
        snapshot: () => snapshot,
        async action(action, payload = {}) {
            results.delete(action);
            send(action, payload);
            const result = await until(() => results.get(action), "pi_xpi_backend_action_timeout");
            assert.isTrue(result.ok, `installed action ${action} must succeed`);
            return result;
        },
        send,
        close() {
            frame.removeEventListener("message", observe);
            send("cancel");
        },
    };
}
/** Real modal confirmation input, restricted to this fixture's loopback URL. */
function approveFixtureEndpoint(endpoint) {
    return setInterval(() => {
        const windows = Services.wm.getEnumerator("");
        while (windows.hasMoreElements()) {
            const win = windows.getNext();
            if (!win.document.documentElement?.textContent?.includes(endpoint))
                continue;
            const dialog = win.document.querySelector("dialog");
            const accept = dialog?.getButton?.("accept") ||
                win.document.querySelector('[dlgtype="accept"],#button0');
            accept?.click();
        }
    }, 100);
}
export async function runInstalledPiChains() {
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_PI_ENDPOINT");
    assert.isNotEmpty(endpoint, "installed chains require the deterministic external provider");
    const root = joinNativePath(getRuntimePersistencePaths().tmpDir, `pi-xpi-${Date.now()}`);
    const fixture = await createPiCapacityFixture({ root });
    const overlayPath = joinNativePath(root, "models.yml");
    await writeRuntimeTextFile(overlayPath, `providers:\n  xpi-fixture:\n    api: openai-completions\n    baseUrl: ${endpoint}\n    models:\n      - id: xpi-fixture\n        contextWindow: 32000\n        maxTokens: 2048\n        input: [text]\n        supportsTools: true\n`);
    const manager = await installedBackendManager();
    try {
        await manager.action("pi-put-credential", {
            id: "xpi-fixture-key",
            label: "XPI fixture",
            secret: "local-fixture-only",
        });
        await manager.action("pi-refresh-overlay", { path: overlayPath });
        await manager.action("pi-upsert-configuration", {
            configuration: {
                id: "xpi-fixture",
                label: "XPI fixture",
                provider: "xpi-fixture",
                modelId: "xpi-fixture",
                authVariant: "api-key",
                credentialRef: "xpi-fixture-key",
                enabled: true,
                api: "openai-completions",
                baseUrl: endpoint,
                reasoning: "off",
            },
        });
        await manager.action("pi-set-defaults", {
            defaults: {
                conversation: { configurationId: "xpi-fixture" },
                skillRun: { configurationId: "xpi-fixture" },
                global: { configurationId: "xpi-fixture" },
            },
        });
        await until(() => manager.snapshot()?.builtinAgent?.configurationStatus?.["xpi-fixture"] === "configured"
            ? true
            : undefined, "pi_xpi_configuration_unavailable");
    }
    finally {
        manager.close();
    }
    const ui = await openInstalledPiUi();
    const shell = ui.shellWindow();
    const win = Zotero.getMainWindow();
    const approval = approveFixtureEndpoint(endpoint);
    const oldSkillDir = getPref("skillDir");
    const oldSettings = getPref("workflowSettingsJson");
    try {
        const tab = await until(() => shell.document.querySelector('[data-tab="pi-conversations"]') ||
            undefined, "pi_xpi_tab_missing");
        tab.click();
        await ui.action("new-conversation", { groupId: "pi-conversations" }, null);
        const owner = (await until(() => ui.selectedOwner(), "pi_xpi_conversation_missing"));
        const observationKey = owner.ownerKey || owner.conversationId;
        let completedTurns = 0;
        for (const prompt of [
            "[system-e2e:slow] [system-e2e:tool:zotero_context_get_current_view] read the current view",
            "[system-e2e:slow] Second turn: acknowledge the previous answer.",
        ]) {
            await ui.action("send-prompt", { message: prompt });
            completedTurns += 1;
            await until(async () => {
                const observed = await inspectPiOwner({
                    kind: "conversation",
                    ownerId: owner.conversationId,
                });
                const entry = ui.observation(observationKey);
                if (["failed", "waiting_permission", "recovery_required"].includes(entry?.status || ""))
                    throw new Error("pi_xpi_turn_failed");
                return observed.entries.filter((entry) => entry.kind === "turn_terminal").length >= completedTurns && entry?.status === "idle"
                    ? true
                    : undefined;
            }, "pi_xpi_turn_timeout");
            assert.equal(ui.observation(observationKey)?.status, "idle");
        }
        const conversation = await inspectPiOwner({
            kind: "conversation",
            ownerId: owner.conversationId,
        });
        const observedOwner = ui.observation(observationKey);
        if (!observedOwner?.streamed)
            window.debug?.({
                kind: "pi-xpi-transcript-observation",
                transcriptForms: observedOwner?.transcriptForms || {},
            });
        assert.isTrue(ui.observation(observationKey)?.streamed, "installed streaming publication required");
        assert.equal(conversation.entries.filter((entry) => entry.kind === "turn_terminal")
            .length, 2);
        assert.isTrue(conversation.entries.some((entry) => entry.kind === "tool_result"));
        assert.isTrue(conversation.entries.some((entry) => entry.kind === "tool_result" &&
            entry.payload.status === "completed" &&
            entry.payload.effectCertainty === "confirmed_complete"));
        setPref("skillDir", fixture.skillsRoot);
        setPref("workflowSettingsJson", JSON.stringify({
            schemaVersion: 2,
            workflows: { [fixture.workflowId]: { backendId: "builtin-pi" } },
        }));
        await plugin().hooks.onPrefsEvent("scanWorkflows", {
            workflowsDir: fixture.workflowDir,
        });
        const before = new Set(listPiSkillRunRegistry().map((entry) => entry.requestId));
        const popup = win.document.getElementById("zotero-skills-workflows-popup");
        assert.exists(popup);
        popup.dispatchEvent(new win.Event("popupshowing", { bubbles: true }));
        const menu = await until(() => Array.from(popup.querySelectorAll("menuitem")).find((entry) => entry.getAttribute("label") === "Pi Capacity Auto"), "pi_xpi_workflow_menu_missing");
        menu.dispatchEvent(new win.Event("command", { bubbles: true }));
        const requestId = await until(() => listPiSkillRunRegistry().find((entry) => !before.has(entry.requestId))
            ?.requestId, "pi_xpi_auto_admission_missing");
        const auto = await until(async () => {
            const observed = await inspectPiOwner({
                kind: "skill_run",
                ownerId: requestId,
            });
            return observed.entries.some((entry) => entry.kind === "skill_run_terminal_ack")
                ? observed
                : undefined;
        }, "pi_xpi_auto_ack_missing");
        assert.isTrue(auto.entries.some((entry) => entry.kind === "skill_run_result_sealed"));
        assert.equal(auto.entries.find((entry) => entry.kind === "skill_run_outcome")
            ?.payload?.result?.status, "succeeded");
        assert.equal(auto.entries.find((entry) => entry.kind === "skill_run_apply_receipt")
            ?.payload?.status, "succeeded");
        await ui.action("archive-conversation", {});
        await ui.action("delete-conversation", {});
        return {
            conversationTurns: 2,
            autoSealed: true,
            autoApplied: true,
            autoAcknowledged: true,
        };
    }
    finally {
        clearInterval(approval);
        ui.close();
        setPref("skillDir", oldSkillDir);
        setPref("workflowSettingsJson", oldSettings);
    }
}
/**
 * TRANSIENT DIAGNOSTIC (remove after the installed-XPI root cause is fixed).
 * Subscribes to the installed plugin's provider-error classification and
 * forwards only the fixed enum to the test reporter. No error name, regex
 * capture, stack or provider body crosses this boundary.
 */
export function observeInstalledPiProviderErrorClassification(win) {
    const allowed = [
        "console",
        "textdecoder",
        "request",
        "structuredclone",
        "abortcontroller",
        "url",
        "btoa",
        "atob",
        "crypto",
        "streamendednofinish",
        "other",
    ];
    const handler = (event) => {
        const detail = event.detail;
        const classification = String(detail?.classification || "");
        if (!allowed.includes(classification))
            return;
        win.debug?.({
            kind: "zotero-compatibility-pi-provider-error",
            classification,
        });
    };
    win.addEventListener("zotero-agents:pi-provider-error-classification", handler);
    return () => win.removeEventListener("zotero-agents:pi-provider-error-classification", handler);
}
