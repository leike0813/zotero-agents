(function () {
  "use strict";

  function text(value) {
    return String(value || "").trim();
  }

  function ownerMatches(owner, source, ownerKey) {
    return (
      owner &&
      typeof owner === "object" &&
      owner.source === source &&
      text(owner.ownerKey) === text(ownerKey)
    );
  }

  const regionStateKeys = {
    "baseline-status": "baselineStatus",
    "message-counts": "messageCounts",
    "owner-navigation": "ownerNavigation",
    transcript: "transcript",
    plan: "plan",
    permission: "permission",
    "reply-hint": "replyHint",
    "context-details": "contextDetails",
  };

  function readStateRegion(snapshot, kind) {
    const key = regionStateKeys[kind];
    const regions =
      snapshot && snapshot.regions && typeof snapshot.regions === "object"
        ? snapshot.regions
        : null;
    return key && regions && regions[key] && typeof regions[key] === "object"
      ? regions[key]
      : null;
  }

  function readRegion(snapshot, source, ownerKey) {
    const region = readStateRegion(snapshot, "transcript");
    if (!region) return null;
    if (region.status === "idle") return ownerKey ? null : region;
    return ownerMatches(region.owner, source, ownerKey) ? region : null;
  }

  function rendererPage(region) {
    const page =
      region && region.status === "ready" && region.page ? region.page : null;
    if (!page || !Array.isArray(page.items)) return null;
    return {
      ownerKey: text(region.owner && region.owner.ownerKey),
      pageKey: text(page.pageKey),
      startCursor: Math.max(0, Number(page.startCursor) || 0),
      limit: Math.max(1, Number(page.limit) || 80),
      totalVisibleItemCount: Math.max(
        0,
        Number(page.totalVisibleItemCount) || 0,
      ),
      previousCursor:
        typeof page.previousCursor === "number" ? page.previousCursor : null,
      nextCursor: typeof page.nextCursor === "number" ? page.nextCursor : null,
      sourceEventSeq: Math.max(0, Number(page.sourceEventSeq) || 0),
      transcriptRevision: Math.max(0, Number(region.transcriptRevision) || 0),
      items: page.items,
    };
  }

  function errorMessage(region) {
    return text(region && region.error && region.error.message);
  }

  function createPageRequest(owner, cursor, limit) {
    if (!owner || typeof owner !== "object" || !text(owner.ownerKey)) {
      return null;
    }
    let canonicalOwner = null;
    if (
      owner.source === "acp-chat" &&
      text(owner.backendId) &&
      text(owner.conversationId) &&
      text(owner.ownerKey) ===
        text(owner.backendId) + "\n" + text(owner.conversationId)
    ) {
      canonicalOwner = {
        source: "acp-chat",
        ownerKey: text(owner.ownerKey),
        backendId: text(owner.backendId),
        conversationId: text(owner.conversationId),
      };
    } else if (
      owner.source === "acp-skills" &&
      text(owner.requestId) &&
      text(owner.ownerKey) === text(owner.requestId)
    ) {
      canonicalOwner = {
        source: "acp-skills",
        ownerKey: text(owner.ownerKey),
        requestId: text(owner.requestId),
      };
    }
    if (!canonicalOwner) return null;
    const numericCursor = Number(cursor);
    const numericLimit = Number(limit);
    return {
      owner: canonicalOwner,
      request: {
        cursor:
          cursor === null || cursor === undefined
            ? null
            : Number.isFinite(numericCursor)
              ? Math.max(0, Math.floor(numericCursor))
              : null,
        limit: Number.isFinite(numericLimit)
          ? Math.max(1, Math.floor(numericLimit))
          : 80,
      },
    };
  }

  function baselineRegion(snapshot) {
    return (
      readStateRegion(snapshot, "baseline-status") || {
        status: "idle",
        busy: false,
        message: null,
        connection: {
          status: "idle",
          sessionAvailable: false,
          connected: false,
          canConnect: false,
          canDisconnect: false,
        },
        execution: { canCancel: false, canInterrupt: false },
      }
    );
  }

  function navigationRegion(snapshot) {
    return (
      readStateRegion(snapshot, "owner-navigation") || {
        selectedOwner: null,
        selectedGroupId: null,
        groups: [],
        entries: [],
        canCreateOwner: false,
      }
    );
  }

  function permissionPresentation(permission) {
    return permission && permission.request
      ? {
          requestId: permission.request.requestId,
          toolTitle: permission.request.title,
          summary: permission.request.summary,
          options: (permission.request.options || []).map(function (option) {
            return {
              optionId: option.optionId,
              name: option.label,
              description: option.description || undefined,
            };
          }),
        }
      : null;
  }

  function createPanelPresentation(snapshot, options) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const binding = options && typeof options === "object" ? options : {};
    const surface = binding.source;
    const navigation = navigationRegion(source);
    const baseline = baselineRegion(source);
    const transcript = readStateRegion(source, "transcript");
    const counts = readStateRegion(source, "message-counts");
    const plan = readStateRegion(source, "plan") || { items: [] };
    const permission = readStateRegion(source, "permission") || {
      request: null,
    };
    const contextDetails = readStateRegion(source, "context-details") || {
      context: [],
      details: [],
    };
    const reply = readStateRegion(source, "reply-hint") || {
      reply: { status: "disabled", hint: null },
      runtimeOptions: {},
    };
    const labels =
      binding.labels && typeof binding.labels === "object"
        ? binding.labels
        : source.labels || {};
    const configuration =
      binding.configuration && typeof binding.configuration === "object"
        ? binding.configuration
        : {};
    const runtimeOptions = reply.runtimeOptions || {};
    const mode = presentationOptions(runtimeOptions.mode);
    const model = presentationOptions(runtimeOptions.model);
    const reasoning = presentationOptions(runtimeOptions.reasoningEffort);
    const pendingPermission = permissionPresentation(permission);

    if (surface === "acp-chat") {
      const owner =
        source.owner && source.owner.source === surface
          ? source.owner
          : navigation.selectedOwner;
      const activeBackendId =
        text(owner && owner.backendId) || text(navigation.selectedGroupId);
      const activeConversationId = text(owner && owner.conversationId);
      const items =
        transcript && transcript.page && Array.isArray(transcript.page.items)
          ? transcript.page.items.slice()
          : [];
      if (Array.isArray(plan.items) && plan.items.length) {
        items.push({
          id: "assistant-workspace-plan",
          kind: "plan",
          entries: plan.items.map(function (entry) {
            return {
              content: entry.content,
              priority: entry.priority || "medium",
              status: entry.status || "pending",
            };
          }),
        });
      }
      return {
        labels,
        title: text(labels.title) || "ACP Chat",
        activeBackendId,
        backendId: activeBackendId,
        activeConversationId,
        conversationId: activeConversationId,
        backendAvailability: activeBackendId ? "selected" : "none",
        conversationAvailability: activeConversationId ? "selected" : "none",
        status: text(baseline.status) || "idle",
        busy: baseline.busy === true,
        lastError: text(baseline.message),
        sessionId:
          baseline.connection && baseline.connection.connected
            ? activeConversationId
            : "",
        transcriptRegion: transcript,
        transcriptRevision: Number(
          (transcript && transcript.transcriptRevision) || 0,
        ),
        messageCounts: counts ? counts.counts : null,
        items,
        pendingPermissionRequest: pendingPermission,
        workspaceContextDetails: contextDetails,
        modeOptions: mode.options,
        currentMode: mode.selected,
        displayModelOptions: model.options,
        currentDisplayModel: model.selected,
        reasoningEffortOptions: reasoning.options,
        currentReasoningEffort: reasoning.selected,
        backendOptions: (navigation.groups || []).map(function (group) {
          return {
            backendId: text(group.groupId),
            displayName: text(group.label),
            status: text(group.status),
          };
        }),
        chatSessions: (navigation.entries || [])
          .filter(function (entry) {
            return text(entry.groupId) === activeBackendId;
          })
          .map(function (entry) {
            return {
              conversationId: text(entry.owner && entry.owner.conversationId),
              title: text(entry.label),
              status: text(entry.status),
              lastError: text(entry.description),
            };
          }),
        backendChatSessions: (navigation.groups || []).map(function (group) {
          return {
            backendId: text(group.groupId),
            displayName: text(group.label),
            sessions: (navigation.entries || [])
              .filter(function (entry) {
                return text(entry.groupId) === text(group.groupId);
              })
              .map(function (entry) {
                return {
                  conversationId: text(
                    entry.owner && entry.owner.conversationId,
                  ),
                  title: text(entry.label),
                  status: text(entry.status),
                  lastError: text(entry.description),
                };
              }),
          };
        }),
        chatDisplayMode:
          binding.chatDisplayMode === "bubble" ? "bubble" : "plain",
        executionDisplayMode: configuration.executionDisplayMode || "live",
        transcriptPaginationVirtualizationEnabled:
          configuration.transcriptPaginationVirtualizationEnabled !== false,
      };
    }

    if (surface === "acp-skills") {
      const owner =
        source.owner && source.owner.source === surface
          ? source.owner
          : navigation.selectedOwner;
      const selectedRequestId = text(owner && owner.requestId);
      const runs = (navigation.entries || []).map(function (entry) {
        const requestId = text(entry.owner && entry.owner.requestId);
        const selected = requestId === selectedRequestId;
        return {
          requestId,
          taskName: text(entry.label),
          status: selected
            ? text(baseline.status) || text(entry.status) || "idle"
            : text(entry.status) || "idle",
          error: selected
            ? text(baseline.message) || undefined
            : text(entry.description) || undefined,
          backendId: text(entry.groupId),
          backendLabel: text(entry.groupLabel),
          activePrompt: selected && baseline.busy === true,
          pendingPermission: selected ? pendingPermission : null,
          pendingInteraction:
            selected && reply.reply && reply.reply.hint
              ? { message: reply.reply.hint }
              : null,
          sessionId:
            selected && baseline.connection.sessionAvailable ? requestId : "",
          conversationState:
            selected && baseline.connection.connected ? "active" : "closed",
          conversationRecoveryState:
            selected && baseline.connection.connected
              ? "connected"
              : baseline.connection.canConnect
                ? "available"
                : "unavailable",
          connectionActionState:
            selected && baseline.connection.canDisconnect
              ? "connected"
              : selected && baseline.connection.canConnect
                ? "available"
                : text(baseline.connection.status),
          replyState:
            selected && reply.reply && reply.reply.status === "busy"
              ? "sending"
              : "idle",
        };
      });
      return {
        labels,
        selectedRequestId,
        runs,
        selectedRun:
          runs.find(function (run) {
            return run.requestId === selectedRequestId;
          }) || null,
        transcriptRegion: transcript,
        messageCounts: counts ? counts.counts : null,
        workspaceContextDetails: contextDetails,
        selectedRuntimeOptions: {
          modeOptions: mode.options,
          currentMode: mode.selected,
          modelOptions: model.options,
          currentModel: model.selected,
          displayModelOptions: model.options,
          currentDisplayModel: model.selected,
          reasoningEffortOptions: reasoning.options,
          currentReasoningEffort: reasoning.selected,
        },
        transcriptPaginationVirtualizationEnabled:
          configuration.transcriptPaginationVirtualizationEnabled !== false,
        executionDisplayMode: configuration.executionDisplayMode || "live",
      };
    }
    return null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createPageModel(page) {
    const items = page && Array.isArray(page.items) ? page.items : [];
    const itemsById = new Map();
    const itemOrder = [];
    items.forEach(function (item) {
      const itemId = text(item && item.itemId);
      if (!itemId || itemsById.has(itemId)) return;
      itemsById.set(itemId, item);
      itemOrder.push(itemId);
    });
    return { page: page || null, itemsById, itemOrder };
  }

  function validatePageMetadata(page) {
    if (!page || typeof page !== "object" || !text(page.pageKey)) return null;
    const startCursor = Number(page.startCursor);
    const limit = Number(page.limit);
    const totalVisibleItemCount = Number(page.totalVisibleItemCount);
    const sourceEventSeq = Number(page.sourceEventSeq);
    if (
      !Number.isInteger(startCursor) ||
      startCursor < 0 ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      !Number.isInteger(totalVisibleItemCount) ||
      totalVisibleItemCount < 0 ||
      !Number.isInteger(sourceEventSeq) ||
      sourceEventSeq < 0
    ) {
      return null;
    }
    return {
      pageKey: text(page.pageKey),
      startCursor,
      limit,
      totalVisibleItemCount,
      previousCursor:
        typeof page.previousCursor === "number" ? page.previousCursor : null,
      nextCursor: typeof page.nextCursor === "number" ? page.nextCursor : null,
      sourceEventSeq,
    };
  }

  function isTailPageKey(pageKey) {
    return /\ntail:\d+$/.test(text(pageKey));
  }

  function planMutationBatch(model, mutations) {
    if (!model || !model.page || !Array.isArray(mutations)) return null;
    const knownItemIds = new Set(model.itemOrder);
    const replacements = new Map();
    const appendedItemIds = [];
    const deletedItemIds = new Set();
    const affectedItemIds = new Set();

    function currentItem(itemId) {
      return replacements.has(itemId)
        ? replacements.get(itemId)
        : model.itemsById.get(itemId);
    }

    for (const mutation of mutations) {
      if (!mutation || typeof mutation !== "object") return null;
      if (mutation.op === "upsert_item") {
        const item = mutation.item;
        const itemId = text(item && item.itemId);
        if (!itemId || !text(item && item.itemKind)) return null;
        if (!knownItemIds.has(itemId)) {
          knownItemIds.add(itemId);
          appendedItemIds.push(itemId);
        }
        deletedItemIds.delete(itemId);
        replacements.set(itemId, clone(item));
        affectedItemIds.add(itemId);
        continue;
      }
      const itemId = text(mutation.itemId);
      if (!itemId || !knownItemIds.has(itemId) || deletedItemIds.has(itemId)) {
        return null;
      }
      const item = currentItem(itemId);
      if (!item) return null;
      if (mutation.op === "append_text") {
        if (
          (item.itemKind !== "message" && item.itemKind !== "thought") ||
          typeof mutation.text !== "string"
        ) {
          return null;
        }
        replacements.set(
          itemId,
          Object.assign({}, item, {
            text: String(item.text || "") + mutation.text,
          }),
        );
        affectedItemIds.add(itemId);
      } else if (mutation.op === "patch_item") {
        if (
          !mutation.patch ||
          typeof mutation.patch !== "object" ||
          Object.prototype.hasOwnProperty.call(mutation.patch, "itemId") ||
          Object.prototype.hasOwnProperty.call(mutation.patch, "itemKind")
        ) {
          return null;
        }
        replacements.set(
          itemId,
          Object.assign({}, item, clone(mutation.patch)),
        );
        affectedItemIds.add(itemId);
      } else if (mutation.op === "delete_item") {
        deletedItemIds.add(itemId);
        replacements.delete(itemId);
        affectedItemIds.delete(itemId);
      } else {
        return null;
      }
    }

    return {
      replacements,
      appendedItemIds,
      deletedItemIds,
      affectedItemIds,
    };
  }

  function commitMutationBatch(page, model, pageMetadata, transaction) {
    const startAdvance = pageMetadata.startCursor - Number(page.startCursor);
    if (startAdvance < 0) return null;
    let order = model.itemOrder
      .filter(function (itemId) {
        return !transaction.deletedItemIds.has(itemId);
      })
      .concat(transaction.appendedItemIds);
    if (startAdvance > order.length) return null;
    if (startAdvance > 0) order = order.slice(startAdvance);
    if (order.length > pageMetadata.limit) {
      order = order.slice(order.length - pageMetadata.limit);
    }
    const expectedLength = Math.min(
      pageMetadata.limit,
      Math.max(
        0,
        pageMetadata.totalVisibleItemCount - pageMetadata.startCursor,
      ),
    );
    if (order.length !== expectedLength) return null;
    const items = [];
    for (const itemId of order) {
      const item = transaction.replacements.has(itemId)
        ? transaction.replacements.get(itemId)
        : model.itemsById.get(itemId);
      if (!item) return null;
      items.push(item);
    }
    const affectedItems = [];
    transaction.affectedItemIds.forEach(function (itemId) {
      if (order.indexOf(itemId) < 0) return;
      const item = transaction.replacements.has(itemId)
        ? transaction.replacements.get(itemId)
        : model.itemsById.get(itemId);
      if (item) affectedItems.push(item);
    });
    return {
      items,
      affectedItems,
      evictedItemIds: model.itemOrder.filter(function (itemId) {
        return (
          order.indexOf(itemId) < 0 && !transaction.deletedItemIds.has(itemId)
        );
      }),
    };
  }

  function createReceiver(options) {
    const source = options && options.source;
    const revisions = new Map();
    const terminalResults = new Map();
    let deliverySequence = 0;
    let activeOwnerKey = "";
    let selectedPageModel = createPageModel(null);
    function rememberTerminal(publicationId, result) {
      terminalResults.delete(publicationId);
      terminalResults.set(publicationId, {
        accepted: result.accepted,
        reason: result.reason,
      });
      while (terminalResults.size > 512) {
        terminalResults.delete(terminalResults.keys().next().value);
      }
    }
    function rejected(publication, reason, snapshot) {
      const result = {
        accepted: false,
        reason,
        snapshot,
      };
      const publicationId = text(publication && publication.publicationId);
      if (publicationId) rememberTerminal(publicationId, result);
      return result;
    }
    function plan(snapshot, publication, currentOwnerKey) {
      const publicationId = text(publication && publication.publicationId);
      const previousTerminal = terminalResults.get(publicationId);
      if (publicationId && previousTerminal) {
        return Object.assign({}, previousTerminal, {
          snapshot,
          duplicate: true,
          effect: { kind: "none" },
        });
      }
      const bootstrapSnapshot =
        publication &&
        publication.publicationKind === "transcript" &&
        publication.publicationForm === "snapshot" &&
        !text(currentOwnerKey) &&
        ((publication.owner &&
          publication.owner.source === source &&
          publication.owner.ownerKey === null &&
          publication.payload &&
          publication.payload.status === "idle" &&
          publication.payload.owner === null) ||
          ownerMatches(
            publication.payload && publication.payload.owner,
            source,
            publication.owner && publication.owner.ownerKey,
          ));
      const unownedNavigation =
        publication &&
        publication.publicationKind === "owner-navigation" &&
        publication.publicationForm === "region" &&
        publication.owner &&
        publication.owner.source === source &&
        publication.owner.ownerKey === null;
      if (
        !publication ||
        publication.schema !==
          "zotero-agents.assistant-workspace-publication.v4" ||
        !publicationId ||
        (!bootstrapSnapshot &&
          !unownedNavigation &&
          !ownerMatches(publication.owner, source, currentOwnerKey))
      ) {
        return rejected(
          publication,
          publication && publication.owner ? "old-owner" : "invalid",
          snapshot,
        );
      }
      const sequence = Math.max(0, Number(publication.deliverySequence) || 0);
      if (sequence <= deliverySequence) {
        return rejected(publication, "superseded", snapshot);
      }
      const navigationOwner =
        unownedNavigation &&
        publication.payload &&
        publication.payload.selectedOwner &&
        publication.payload.selectedOwner.source === source
          ? publication.payload.selectedOwner
          : null;
      const nextOwnerKey = unownedNavigation
        ? text(navigationOwner && navigationOwner.ownerKey)
        : text(publication.owner.ownerKey);
      const ownerChanged = !!activeOwnerKey && activeOwnerKey !== nextOwnerKey;
      const revisionKey = nextOwnerKey + "\n" + publication.publicationKind;
      const revision = Math.max(0, Number(publication.regionRevision) || 0);
      const previousRevision = ownerChanged
        ? 0
        : revisions.get(revisionKey) || 0;
      if (revision <= previousRevision) {
        return rejected(publication, "stale", snapshot);
      }
      const next = Object.assign({}, snapshot || {});
      let effect = { kind: "region" };
      let nextPageModel = ownerChanged
        ? createPageModel(null)
        : selectedPageModel;
      if (publication.publicationKind === "transcript") {
        const current = readStateRegion(next, "transcript");
        if (publication.publicationForm === "snapshot") {
          if (
            publication.payload &&
            publication.payload.status !== "idle" &&
            !ownerMatches(
              publication.payload.owner,
              source,
              publication.owner && publication.owner.ownerKey,
            )
          ) {
            return rejected(publication, "invalid", snapshot);
          }
          const transcript = clone(publication.payload);
          next.regions = Object.assign({}, next.regions || {}, {
            transcript,
          });
          nextPageModel = createPageModel(transcript.page);
          effect = { kind: "snapshot" };
        } else if (publication.publicationForm === "delta") {
          const payload = publication.payload || {};
          if (
            !current ||
            current.status !== "ready" ||
            !current.page ||
            Number(current.transcriptRevision) !==
              Number(payload.baseTranscriptRevision)
          ) {
            return rejected(publication, "gap", snapshot);
          }
          const pageMetadata = validatePageMetadata(payload.page);
          if (!pageMetadata) {
            return rejected(publication, "invalid", snapshot);
          }
          const samePageKey =
            text(current.page.pageKey) === text(pageMetadata.pageKey);
          const onSelectedPage =
            samePageKey &&
            (isTailPageKey(pageMetadata.pageKey) ||
              Number(current.page.startCursor) === pageMetadata.startCursor);
          const currentPageModel =
            nextPageModel.page === current.page
              ? nextPageModel
              : createPageModel(current.page);
          const transaction = onSelectedPage
            ? planMutationBatch(currentPageModel, payload.mutations)
            : null;
          const applied =
            onSelectedPage && transaction
              ? commitMutationBatch(
                  current.page,
                  currentPageModel,
                  pageMetadata,
                  transaction,
                )
              : null;
          if (onSelectedPage && !applied) {
            return rejected(publication, "gap", snapshot);
          }
          const nextPage = onSelectedPage
            ? Object.assign({}, current.page, pageMetadata, {
                items: applied.items,
              })
            : Object.assign({}, current.page, {
                totalVisibleItemCount: pageMetadata.totalVisibleItemCount,
                sourceEventSeq: pageMetadata.sourceEventSeq,
              });
          const transcript = Object.assign({}, current, {
            transcriptRevision: Number(payload.transcriptRevision) || 0,
            page: nextPage,
          });
          next.regions = Object.assign({}, next.regions || {}, {
            transcript,
          });
          nextPageModel = createPageModel(nextPage);
          effect = {
            kind: "mutations",
            onSelectedPage,
            mutations: onSelectedPage
              ? (payload.mutations || []).map(clone)
              : [],
            affectedItems: applied ? applied.affectedItems : [],
            pageItems: applied ? applied.items : [],
            evictedItemIds: applied ? applied.evictedItemIds : [],
          };
        } else {
          return rejected(publication, "invalid", snapshot);
        }
      } else {
        const regionKey = regionStateKeys[publication.publicationKind];
        if (!regionKey) {
          return rejected(publication, "invalid", snapshot);
        }
        next.regions = Object.assign({}, next.regions || {}, {
          [regionKey]: clone(publication.payload || {}),
        });
      }
      if (publication.publicationKind === "owner-navigation") {
        next.owner = navigationOwner ? clone(navigationOwner) : null;
      } else if (publication.owner.ownerKey !== null) {
        next.owner = clone(publication.owner);
      }
      const result = {
        accepted: true,
        reason: null,
        snapshot: next,
        publicationKind: publication.publicationKind,
        effect,
        commit: function () {
          if (ownerChanged) revisions.clear();
          activeOwnerKey = nextOwnerKey;
          deliverySequence = sequence;
          revisions.set(revisionKey, revision);
          selectedPageModel = nextPageModel;
          rememberTerminal(publicationId, result);
        },
      };
      return result;
    }
    return {
      complete: function (publicationId, outcome, reason) {
        const id = text(publicationId);
        if (!id) return;
        rememberTerminal(id, {
          accepted: outcome === "accepted",
          reason: reason || null,
        });
      },
      plan,
      apply: function (snapshot, publication, currentOwnerKey) {
        const result = plan(snapshot, publication, currentOwnerKey);
        if (result.accepted && typeof result.commit === "function") {
          result.commit();
          delete result.commit;
        }
        return result;
      },
    };
  }

  function createClient(options) {
    const receiver = createReceiver({ source: options && options.source });
    return {
      apply: function (publication) {
        const snapshot = options.getSnapshot() || {};
        const result = receiver.plan(
          snapshot,
          publication,
          options.getOwnerKey(snapshot),
        );
        options.ack(
          publication,
          "child-apply",
          result.accepted ? "accepted" : "rejected",
          result.reason,
        );
        if (!result.accepted) {
          receiver.complete(
            publication && publication.publicationId,
            "rejected",
            result.reason,
          );
          return result;
        }
        try {
          const rendered = options.render(result, publication);
          if (rendered === false) throw new Error("transcript-render-failed");
          options.setSnapshot(result.snapshot);
          if (typeof result.commit === "function") {
            result.commit();
            delete result.commit;
          }
          receiver.complete(
            publication && publication.publicationId,
            "accepted",
            null,
          );
          options.ack(publication, "render-complete", "accepted", null);
        } catch (_error) {
          receiver.complete(
            publication && publication.publicationId,
            "rejected",
            "render-failed",
          );
          options.ack(
            publication,
            "render-complete",
            "rejected",
            "render-failed",
          );
        }
        return result;
      },
    };
  }

  function createController(options) {
    const client = createClient(options || {});
    const pendingPublications = [];
    let applying = false;

    function applyPublication(publication) {
      pendingPublications.push(publication);
      if (applying) return;
      applying = true;
      try {
        while (pendingPublications.length > 0) {
          client.apply(pendingPublications.shift());
        }
      } finally {
        applying = false;
      }
    }

    return { applyPublication };
  }

  function renderResult(result, options) {
    const opts = options || {};
    const snapshot = (result && result.snapshot) || {};
    const kind = result && result.publicationKind;
    const reportEffect = function (observation) {
      if (typeof opts.onEffectRendered !== "function") return;
      try {
        opts.onEffectRendered(observation);
      } catch (_error) {
        return;
      }
    };
    const labels =
      typeof opts.getLabels === "function"
        ? opts.getLabels(snapshot) || {}
        : {};
    if (kind === "message-counts") {
      const countsRegion = readStateRegion(snapshot, "message-counts");
      return !!(
        opts.panelRenderer &&
        typeof opts.panelRenderer.renderAssistantMessageCounts === "function" &&
        opts.panelRenderer.renderAssistantMessageCounts(
          opts.messageCountContainer,
          countsRegion ? countsRegion.counts : null,
          labels,
        )
      );
    }
    if (kind !== "transcript") {
      return typeof opts.renderRegion === "function"
        ? opts.renderRegion(result)
        : true;
    }
    const ownerKey =
      typeof opts.getOwnerKey === "function"
        ? text(opts.getOwnerKey(snapshot))
        : "";
    const region = readRegion(snapshot, opts.source, ownerKey);
    const page = rendererPage(region);
    const effect = result.effect || {};
    if (effect.kind === "none") return true;
    if (effect.kind === "snapshot") {
      if (typeof opts.renderSnapshot !== "function") return false;
      const rendered = opts.renderSnapshot(result);
      if (rendered !== false) {
        reportEffect({
          renderPath: "snapshot",
          insertedRows: 0,
          updatedRows: 0,
          removedRows: 0,
          measuredRows: 0,
        });
      }
      return rendered;
    }
    const mode =
      typeof opts.getMode === "function" ? opts.getMode() : opts.mode;
    return !!(
      opts.transcriptRenderer &&
      typeof opts.transcriptRenderer.applyAssistantTranscriptEffects ===
        "function" &&
      opts.transcriptRenderer.applyAssistantTranscriptEffects({
        container: opts.transcriptContainer,
        nodeMap: opts.rowNodesByKey,
        effect,
        affectedItems: effect.affectedItems || [],
        virtualized:
          !!page &&
          (typeof opts.isVirtualized === "function"
            ? opts.isVirtualized(snapshot, region)
            : true),
        ownerKey: page ? page.ownerKey : undefined,
        page: page || undefined,
        mode: mode === "bubble" ? "bubble" : "plain",
        variant: opts.variant,
        expandedIds: opts.expandedRowKeys,
        renderMarkdown: opts.renderMarkdown,
        formatTime: opts.formatTime,
        labels,
        onEffectRendered: reportEffect,
      })
    );
  }

  function presentationOptions(group) {
    const source = group && typeof group === "object" ? group : {};
    const options = (Array.isArray(source.options) ? source.options : []).map(
      function (option) {
        return {
          id: text(option && option.optionId),
          label: text(option && option.label),
          description: text(option && option.description) || undefined,
        };
      },
    );
    const selected = options.find(function (option) {
      return option.id === text(source.selectedOptionId);
    });
    return { options, selected };
  }

  window.AssistantWorkspaceAcpSurface = {
    createClient,
    createController,
    createPageRequest,
    createPanelPresentation,
    errorMessage,
    createReceiver,
    ownerMatches,
    readRegion,
    readStateRegion,
    renderResult,
    rendererPage,
    presentationOptions,
  };
})();
