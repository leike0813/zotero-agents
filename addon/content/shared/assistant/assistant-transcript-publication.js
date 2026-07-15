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

  function rendererItem(item) {
    const source = item && typeof item === "object" ? item : {};
    const revision =
      source.revision && typeof source.revision === "object"
        ? Object.assign({}, source.revision, {
            latestStatus: source.revision.status,
            latestRepairRound: source.revision.repairRound,
          })
        : source.revision;
    return Object.assign({}, source, {
      id: text(source.itemId),
      kind: source.itemKind === "tool-call" ? "tool_call" : source.itemKind,
      state:
        source.status === "in-progress"
          ? "in_progress"
          : source.status || source.state,
      revision,
    });
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
      items: page.items.map(rendererItem),
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

  function applyMutations(items, mutations) {
    const next = Array.isArray(items) ? items.map(clone) : [];
    const indexById = new Map();
    next.forEach(function (item, index) {
      indexById.set(text(item && item.itemId), index);
    });
    (Array.isArray(mutations) ? mutations : []).forEach(function (mutation) {
      const itemId = text(
        mutation && mutation.op === "upsert_item"
          ? mutation.item && mutation.item.itemId
          : mutation && mutation.itemId,
      );
      if (!itemId) return;
      const index = indexById.get(itemId);
      if (mutation.op === "upsert_item") {
        if (typeof index === "number") next[index] = clone(mutation.item);
        else {
          indexById.set(itemId, next.length);
          next.push(clone(mutation.item));
        }
      } else if (mutation.op === "append_text" && typeof index === "number") {
        next[index].text =
          String(next[index].text || "") + String(mutation.text || "");
      } else if (mutation.op === "patch_item" && typeof index === "number") {
        next[index] = Object.assign(
          {},
          next[index],
          clone(mutation.patch || {}),
        );
      } else if (mutation.op === "delete_item" && typeof index === "number") {
        next.splice(index, 1);
        indexById.clear();
        next.forEach(function (item, itemIndex) {
          indexById.set(text(item && item.itemId), itemIndex);
        });
      }
    });
    return next;
  }

  function createReceiver(options) {
    const source = options && options.source;
    const revisions = new Map();
    let deliverySequence = 0;
    return {
      apply: function (snapshot, publication, currentOwnerKey) {
        if (
          !publication ||
          publication.schema !==
            "zotero-agents.assistant-workspace-publication.v3" ||
          !text(publication.publicationId) ||
          !ownerMatches(publication.owner, source, currentOwnerKey)
        ) {
          return {
            accepted: false,
            reason: publication && publication.owner ? "old-owner" : "invalid",
            snapshot,
          };
        }
        const sequence = Math.max(0, Number(publication.deliverySequence) || 0);
        if (sequence <= deliverySequence) {
          return { accepted: false, reason: "superseded", snapshot };
        }
        const revisionKey =
          publication.owner.ownerKey + "\n" + publication.publicationKind;
        const revision = Math.max(0, Number(publication.regionRevision) || 0);
        const previousRevision = revisions.get(revisionKey) || 0;
        if (revision <= previousRevision) {
          return { accepted: false, reason: "stale", snapshot };
        }
        const next = Object.assign({}, snapshot || {});
        if (publication.publicationKind === "transcript") {
          const current = next.transcriptRegion;
          if (publication.publicationForm === "snapshot") {
            next.transcriptRegion = clone(publication.payload);
          } else if (publication.publicationForm === "delta") {
            const payload = publication.payload || {};
            if (
              !current ||
              current.status !== "ready" ||
              !current.page ||
              Number(current.uiRevision) !== Number(payload.baseUiRevision)
            ) {
              return { accepted: false, reason: "gap", snapshot };
            }
            const onSelectedPage =
              text(current.page.pageKey) ===
                text(payload.page && payload.page.pageKey) &&
              Number(current.page.startCursor) ===
                Number(payload.page && payload.page.startCursor);
            const nextPage = onSelectedPage
              ? Object.assign({}, current.page, payload.page || {}, {
                  items: applyMutations(current.page.items, payload.mutations),
                })
              : Object.assign({}, current.page, {
                  totalItemCount:
                    Number(payload.page && payload.page.totalItemCount) || 0,
                  eventSeq: Number(payload.page && payload.page.eventSeq) || 0,
                });
            next.transcriptRegion = Object.assign({}, current, {
              uiRevision: Number(payload.uiRevision) || 0,
              page: nextPage,
            });
          } else if (publication.publicationForm === "resync-required") {
            return {
              accepted: false,
              reason: "gap",
              snapshot,
              reloadPage: true,
            };
          } else {
            return { accepted: false, reason: "invalid", snapshot };
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
        return {
          accepted: true,
          reason: null,
          snapshot: next,
          publicationKind: publication.publicationKind,
        };
      },
    };
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
    createPageRequest,
    errorMessage,
    createReceiver,
    ownerMatches,
    readRegion,
    rendererPage,
  };
})();
