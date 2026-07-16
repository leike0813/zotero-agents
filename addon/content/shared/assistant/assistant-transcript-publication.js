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

  function readRegion(snapshot, source, ownerKey) {
    const region =
      snapshot &&
      snapshot.transcriptRegion &&
      typeof snapshot.transcriptRegion === "object"
        ? snapshot.transcriptRegion
        : null;
    if (!region) return null;
    if (region.status === "idle") return ownerKey ? null : region;
    return ownerMatches(region.owner, source, ownerKey) ? region : null;
  }

  function rendererPage(region) {
    const page =
      region && region.status === "ready" && region.page ? region.page : null;
    if (!page || !Array.isArray(page.items)) return null;
    return {
      requestId: text(region.owner && region.owner.ownerKey),
      cursor: Math.max(0, Number(page.startCursor) || 0),
      limit: Math.max(1, Number(page.limit) || 80),
      total: Math.max(0, Number(page.totalItemCount) || 0),
      prevCursor:
        typeof page.previousCursor === "number"
          ? page.previousCursor
          : undefined,
      nextCursor:
        typeof page.nextCursor === "number" ? page.nextCursor : undefined,
      eventSeq: Math.max(0, Number(page.eventSeq) || 0),
      transcriptRevision: Math.max(0, Number(region.uiRevision) || 0),
      stableTail: isTailPageKey(page.pageKey),
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
    const totalItemCount = Number(page.totalItemCount);
    const eventSeq = Number(page.eventSeq);
    if (
      !Number.isInteger(startCursor) ||
      startCursor < 0 ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      !Number.isInteger(totalItemCount) ||
      totalItemCount < 0 ||
      !Number.isInteger(eventSeq) ||
      eventSeq < 0
    ) {
      return null;
    }
    return {
      pageKey: text(page.pageKey),
      startCursor,
      limit,
      totalItemCount,
      previousCursor:
        typeof page.previousCursor === "number" ? page.previousCursor : null,
      nextCursor: typeof page.nextCursor === "number" ? page.nextCursor : null,
      eventSeq,
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
      Math.max(0, pageMetadata.totalItemCount - pageMetadata.startCursor),
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
    let selectedPageModel = createPageModel(null);
    function rememberTerminal(publicationId, result) {
      terminalResults.delete(publicationId);
      terminalResults.set(publicationId, {
        accepted: result.accepted,
        reason: result.reason,
        reloadPage: result.reloadPage === true,
      });
      while (terminalResults.size > 512) {
        terminalResults.delete(terminalResults.keys().next().value);
      }
    }
    function rejected(publication, reason, snapshot, reloadPage) {
      const result = {
        accepted: false,
        reason,
        snapshot,
        reloadPage: reloadPage === true,
      };
      const publicationId = text(publication && publication.publicationId);
      if (publicationId) rememberTerminal(publicationId, result);
      return result;
    }
    return {
      complete: function (publicationId, outcome, reason) {
        const id = text(publicationId);
        if (!id) return;
        rememberTerminal(id, {
          accepted: outcome === "accepted",
          reason: reason || null,
          reloadPage: false,
        });
      },
      apply: function (snapshot, publication, currentOwnerKey) {
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
          (!text(currentOwnerKey) ||
            ownerMatches(
              publication.payload && publication.payload.owner,
              source,
              publication.owner && publication.owner.ownerKey,
            ));
        if (
          !publication ||
          publication.schema !==
            "zotero-agents.assistant-workspace-publication.v3" ||
          !publicationId ||
          (!bootstrapSnapshot &&
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
        const revisionKey =
          publication.owner.ownerKey + "\n" + publication.publicationKind;
        const revision = Math.max(0, Number(publication.regionRevision) || 0);
        const previousRevision = revisions.get(revisionKey) || 0;
        if (revision <= previousRevision) {
          return rejected(publication, "stale", snapshot);
        }
        const next = Object.assign({}, snapshot || {});
        let effect = { kind: "region" };
        if (publication.publicationKind === "transcript") {
          const current = next.transcriptRegion;
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
            next.transcriptRegion = clone(publication.payload);
            selectedPageModel = createPageModel(next.transcriptRegion.page);
            effect = { kind: "snapshot" };
          } else if (publication.publicationForm === "delta") {
            const payload = publication.payload || {};
            if (
              !current ||
              current.status !== "ready" ||
              !current.page ||
              Number(current.uiRevision) !== Number(payload.baseUiRevision)
            ) {
              return rejected(publication, "gap", snapshot);
            }
            const pageMetadata = validatePageMetadata(payload.page);
            if (!pageMetadata) {
              return rejected(publication, "invalid", snapshot, true);
            }
            const samePageKey =
              text(current.page.pageKey) === text(pageMetadata.pageKey);
            const onSelectedPage =
              samePageKey &&
              (isTailPageKey(pageMetadata.pageKey) ||
                Number(current.page.startCursor) === pageMetadata.startCursor);
            if (selectedPageModel.page !== current.page) {
              selectedPageModel = createPageModel(current.page);
            }
            const transaction = onSelectedPage
              ? planMutationBatch(selectedPageModel, payload.mutations)
              : null;
            const applied =
              onSelectedPage && transaction
                ? commitMutationBatch(
                    current.page,
                    selectedPageModel,
                    pageMetadata,
                    transaction,
                  )
                : null;
            if (onSelectedPage && !applied) {
              return rejected(publication, "gap", snapshot, true);
            }
            const nextPage = onSelectedPage
              ? Object.assign({}, current.page, pageMetadata, {
                  items: applied.items,
                })
              : Object.assign({}, current.page, {
                  totalItemCount: pageMetadata.totalItemCount,
                  eventSeq: pageMetadata.eventSeq,
                });
            next.transcriptRegion = Object.assign({}, current, {
              uiRevision: Number(payload.uiRevision) || 0,
              page: nextPage,
            });
            selectedPageModel.page = nextPage;
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
          } else if (publication.publicationForm === "resync-required") {
            return rejected(publication, "gap", snapshot, true);
          } else {
            return rejected(publication, "invalid", snapshot);
          }
        } else if (publication.publicationKind === "message-counts") {
          next.messageCounts = publication.payload
            ? publication.payload.counts
            : null;
        } else {
          applyRegionPayload(
            next,
            source,
            publication.publicationKind,
            publication.payload || {},
          );
        }
        deliverySequence = sequence;
        revisions.set(revisionKey, revision);
        const result = {
          accepted: true,
          reason: null,
          snapshot: next,
          publicationKind: publication.publicationKind,
          effect,
        };
        rememberTerminal(publicationId, result);
        return result;
      },
    };
  }

  function createClient(options) {
    const receiver = createReceiver({ source: options && options.source });
    return {
      apply: function (publication) {
        const snapshot = options.getSnapshot() || {};
        const result = receiver.apply(
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
          if (result.reloadPage && typeof options.requestPage === "function") {
            options.requestPage(publication);
          }
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

  function renderResult(result, options) {
    const opts = options || {};
    const snapshot = (result && result.snapshot) || {};
    const kind = result && result.publicationKind;
    const labels =
      typeof opts.getLabels === "function"
        ? opts.getLabels(snapshot) || {}
        : {};
    if (kind === "message-counts") {
      return !!(
        opts.panelRenderer &&
        typeof opts.panelRenderer.renderAssistantMessageCounts === "function" &&
        opts.panelRenderer.renderAssistantMessageCounts(
          opts.messageCountContainer,
          snapshot.messageCounts,
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
      if (rendered !== false && typeof opts.onEffectRendered === "function") {
        opts.onEffectRendered({
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
        pageKey: page ? page.requestId : undefined,
        page: page || undefined,
        mode: mode === "bubble" ? "bubble" : "plain",
        variant: opts.variant,
        expandedIds: opts.expandedRowKeys,
        renderMarkdown: opts.renderMarkdown,
        formatTime: opts.formatTime,
        labels,
        onEffectRendered: opts.onEffectRendered,
      })
    );
  }

  function legacyOptions(group) {
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

  function applyRegionPayload(snapshot, source, kind, payload) {
    if (kind === "baseline-status") {
      snapshot.statusRegion = clone(payload);
      snapshot.status = payload.status;
      snapshot.busy = payload.busy === true;
      snapshot.lastError = text(payload.message);
      if (source === "acp-skills" && snapshot.selectedRun) {
        snapshot.selectedRun = Object.assign({}, snapshot.selectedRun, {
          status: payload.status,
          activePrompt: payload.busy === true,
          error: text(payload.message) || undefined,
        });
      }
      return;
    }
    if (kind === "reply-hint") {
      snapshot.replyRegion = clone(payload);
      const mode = legacyOptions(
        payload.runtimeOptions && payload.runtimeOptions.mode,
      );
      const model = legacyOptions(
        payload.runtimeOptions && payload.runtimeOptions.model,
      );
      const reasoning = legacyOptions(
        payload.runtimeOptions && payload.runtimeOptions.reasoningEffort,
      );
      if (source === "acp-chat") {
        snapshot.modeOptions = mode.options;
        snapshot.currentMode = mode.selected;
        snapshot.displayModelOptions = model.options;
        snapshot.currentDisplayModel = model.selected;
        snapshot.reasoningEffortOptions = reasoning.options;
        snapshot.currentReasoningEffort = reasoning.selected;
      } else {
        snapshot.selectedRuntimeOptions = {
          modeOptions: mode.options,
          currentMode: mode.selected,
          modelOptions: model.options,
          currentModel: model.selected,
          displayModelOptions: model.options,
          currentDisplayModel: model.selected,
          reasoningEffortOptions: reasoning.options,
          currentReasoningEffort: reasoning.selected,
        };
      }
      return;
    }
    if (kind === "permission") {
      snapshot.permissionRegion = clone(payload);
      const request = payload.request
        ? {
            requestId: payload.request.requestId,
            toolTitle: payload.request.title,
            summary: payload.request.summary,
            options: (payload.request.options || []).map(function (option) {
              return {
                optionId: option.optionId,
                name: option.label,
                description: option.description || undefined,
              };
            }),
          }
        : null;
      if (source === "acp-chat") snapshot.pendingPermissionRequest = request;
      else if (snapshot.selectedRun) {
        snapshot.selectedRun = Object.assign({}, snapshot.selectedRun, {
          pendingPermission: request,
        });
      }
      return;
    }
    if (kind === "plan") {
      snapshot.planRegion = clone(payload);
      const items = (
        Array.isArray(snapshot.items) ? snapshot.items : []
      ).filter(function (item) {
        return !item || item.kind !== "plan";
      });
      if (Array.isArray(payload.items) && payload.items.length) {
        items.push({
          id: "assistant-workspace-plan",
          kind: "plan",
          entries: payload.items.map(function (entry) {
            return {
              content: entry.content,
              priority: entry.priority || "medium",
              status: entry.status || "pending",
            };
          }),
        });
      }
      snapshot.items = items;
      return;
    }
    if (kind === "context-details") {
      snapshot.contextDetailsRegion = clone(payload);
    }
  }

  window.AssistantTranscriptPublication = {
    createClient,
    createPageRequest,
    errorMessage,
    createReceiver,
    ownerMatches,
    readRegion,
    renderResult,
    rendererPage,
  };
})();
