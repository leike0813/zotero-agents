(() => {
  "use strict";

  function safeText(value) {
    return typeof value === "string" ? value : "";
  }

  function normalizeText(value) {
    return safeText(value).replace(/\s+/g, " ").trim();
  }

  function toPositiveInt(value, fallback = 1) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.floor(num);
  }

  function correlationOf(event) {
    const correlation = event && event.correlation;
    return correlation && typeof correlation === "object" ? correlation : {};
  }

  function messageIdOf(event) {
    const messageId = correlationOf(event).message_id;
    return normalizeText(messageId) || null;
  }

  function messageFamilyIdOf(event) {
    const familyId = correlationOf(event).message_family_id;
    const normalized = normalizeText(familyId);
    return normalized || messageIdOf(event);
  }

  function replacesMessageIdOf(event) {
    const replaceId = correlationOf(event).replaces_message_id;
    return normalizeText(replaceId) || null;
  }

  function processTypeOf(event) {
    const correlation = correlationOf(event);
    const fromCorrelation = normalizeText(correlation.process_type);
    if (fromCorrelation) return fromCorrelation;
    const kind = normalizeText(event && event.kind);
    if (kind === "assistant_process") {
      const classification = normalizeText(correlation.classification);
      return classification || "reasoning";
    }
    if (kind === "assistant_message") {
      return "assistant_message";
    }
    return "reasoning";
  }

  function isAssistantProcess(event) {
    return (
      normalizeText(event && event.role) === "assistant" &&
      normalizeText(event && event.kind) === "assistant_process"
    );
  }

  function isAssistantIntermediate(event) {
    return (
      normalizeText(event && event.role) === "assistant" &&
      normalizeText(event && event.kind) === "assistant_message"
    );
  }

  function isAssistantFinal(event) {
    return (
      normalizeText(event && event.role) === "assistant" &&
      normalizeText(event && event.kind) === "assistant_final"
    );
  }

  function isAssistantRevision(event) {
    return (
      normalizeText(event && event.role) === "assistant" &&
      normalizeText(event && event.kind) === "assistant_revision"
    );
  }

  function buildProcessItem(atom) {
    return {
      seq: toPositiveInt(atom.event && atom.event.seq, 0),
      attempt: atom.attempt,
      processType: atom.processType,
      itemKind: atom.atomKind === "intermediate" ? "assistant_message" : "assistant_process",
      text: atom.text || atom.summary,
      summary: atom.summary || atom.text,
      messageId: atom.messageId,
      messageFamilyId: atom.messageFamilyId,
      normalizedText: atom.normalizedText,
      replacesMessageId: atom.replacesMessageId,
      details: atom.details,
      rawRef: atom.rawRef,
      sourceEvent: atom.event,
    };
  }

  function buildCanonicalAtom(event) {
    const correlation = correlationOf(event);
    const displayText = safeText(event && (event.displayText || event.display_text));
    const rawText = safeText(event && event.text);
    const summary = safeText(correlation.summary);
    const text = displayText || rawText || summary;
    const atomKind = isAssistantProcess(event)
      ? "process"
      : isAssistantIntermediate(event)
        ? "intermediate"
        : isAssistantFinal(event)
          ? "final"
          : "message";
    return {
      event,
      atomKind,
      role: normalizeText(event && event.role) || "assistant",
      attempt: toPositiveInt(event && event.attempt, 1),
      text,
      summary: summary || text,
      normalizedText: normalizeText(text || summary),
      messageId: messageIdOf(event),
      messageFamilyId: messageFamilyIdOf(event),
      replacesMessageId: replacesMessageIdOf(event),
      processType: processTypeOf(event),
      details:
        correlation.details && typeof correlation.details === "object"
          ? correlation.details
          : null,
      rawRef:
        correlation.raw_ref && typeof correlation.raw_ref === "object"
          ? correlation.raw_ref
          : null,
    };
  }

  function sameMessageChain(left, right) {
    const leftId = left && typeof left === "object" ? normalizeText(left.messageId) : "";
    const leftReplaceId =
      left && typeof left === "object" ? normalizeText(left.replacesMessageId) : "";
    const leftText =
      left && typeof left === "object" ? normalizeText(left.normalizedText) : "";
    const rightId = right && typeof right === "object" ? normalizeText(right.messageId) : "";
    const rightReplaceId =
      right && typeof right === "object" ? normalizeText(right.replacesMessageId) : "";
    const rightText =
      right && typeof right === "object" ? normalizeText(right.normalizedText) : "";

    if (leftId && rightId && leftId === rightId) return true;
    if (leftId && rightReplaceId && leftId === rightReplaceId) return true;
    if (leftReplaceId && rightId && leftReplaceId === rightId) return true;
    if (leftReplaceId && rightReplaceId && leftReplaceId === rightReplaceId) return true;
    return (
      !leftId &&
      !leftReplaceId &&
      !rightId &&
      !rightReplaceId &&
      !!leftText &&
      leftText === rightText
    );
  }

  function createThinkingChatModel(initialDisplayMode = "plain") {
    const sourceEvents = [];
    const thinkingCollapseState = new Map();
    const revisionCollapseState = new Map();
    let displayMode = normalizeText(initialDisplayMode) === "bubble" ? "bubble" : "plain";

    function revisionIdFor(messageId, attempt) {
      return `revision-${attempt}-${messageId || "unknown"}`;
    }

    function buildCanonicalAtoms() {
      const atoms = [];
      for (const event of sourceEvents) {
        if (!event || typeof event !== "object") continue;
        if (isAssistantRevision(event)) continue;
        const atom = buildCanonicalAtom(event);
        if (atom.atomKind === "final") {
          for (let index = atoms.length - 1; index >= 0; index -= 1) {
            const existing = atoms[index];
            if (!existing || existing.attempt !== atom.attempt) continue;
            if (existing.atomKind !== "intermediate") continue;
            if (sameMessageChain(existing, atom)) {
              atoms.splice(index, 1);
            }
          }
          if (
            atoms.some(
              (existing) =>
                existing.atomKind === "final" &&
                existing.attempt === atom.attempt &&
                sameMessageChain(existing, atom),
            )
          ) {
            continue;
          }
        }
        atoms.push(atom);
      }
      return atoms;
    }

    function buildRevisionMap() {
      const revisionsByMessageId = new Map();
      for (const event of sourceEvents) {
        if (!isAssistantRevision(event)) continue;
        const messageId = messageIdOf(event);
        if (!messageId) continue;
        revisionsByMessageId.set(messageId, event);
      }
      return revisionsByMessageId;
    }

    function buildEntries() {
      const atoms = buildCanonicalAtoms();
      const revisionsByMessageId = buildRevisionMap();
      const entries = [];
      const attemptThinkingCounts = new Map();
      let activeThinking = null;

      function createThinkingEntry(attempt) {
        const nextCount = (attemptThinkingCounts.get(attempt) || 0) + 1;
        attemptThinkingCounts.set(attempt, nextCount);
        const id = `thinking-${attempt}-${nextCount}`;
        const entry = {
          type: "thinking",
          id,
          attempt,
          collapsed: thinkingCollapseState.has(id)
            ? thinkingCollapseState.get(id) === true
            : true,
          items: [],
        };
        entries.push(entry);
        activeThinking = entry;
        return entry;
      }

      function appendThinkingAtom(atom) {
        let entry = activeThinking;
        if (!entry || entry.attempt !== atom.attempt) {
          entry = createThinkingEntry(atom.attempt);
        }
        entry.items.push(buildProcessItem(atom));
      }

      function appendMessageAtom(atom) {
        activeThinking = null;
        entries.push({
          type: "message",
          event: atom.event,
          messageId: atom.messageId,
          messageFamilyId: atom.messageFamilyId,
          replacesMessageId: atom.replacesMessageId,
          normalizedText: atom.normalizedText,
          atomKind: atom.atomKind,
        });
      }

      function appendRevisionAtom(atom, revisionEvent) {
        activeThinking = null;
        const revisionId = revisionIdFor(atom.messageId, atom.attempt);
        entries.push({
          type: "revision",
          id: revisionId,
          collapsed: revisionCollapseState.has(revisionId)
            ? revisionCollapseState.get(revisionId) === true
            : true,
          originalEvent: atom.event,
          revisionEvent,
          messageId: atom.messageId,
          messageFamilyId: atom.messageFamilyId,
        });
      }

      for (const atom of atoms) {
        const revisionEvent = atom.messageId ? revisionsByMessageId.get(atom.messageId) : null;
        if (revisionEvent && atom.atomKind === "final") {
          appendRevisionAtom(atom, revisionEvent);
          continue;
        }
        const shouldGoToThinking =
          atom.atomKind === "process" ||
          (displayMode === "bubble" && atom.atomKind === "intermediate");
        if (shouldGoToThinking) {
          appendThinkingAtom(atom);
          continue;
        }
        appendMessageAtom(atom);
      }

      return entries;
    }

    function toggleThinking(id) {
      const current = thinkingCollapseState.has(id)
        ? thinkingCollapseState.get(id) === true
        : true;
      thinkingCollapseState.set(id, !current);
      return true;
    }

    function toggleRevision(id) {
      const current = revisionCollapseState.has(id)
        ? revisionCollapseState.get(id) === true
        : true;
      revisionCollapseState.set(id, !current);
      return true;
    }

    function setDisplayMode(mode) {
      displayMode = normalizeText(mode) === "bubble" ? "bubble" : "plain";
      return displayMode;
    }

    function getDisplayMode() {
      return displayMode;
    }

    function consume(event) {
      if (!event || typeof event !== "object") return false;
      sourceEvents.push(event);
      return true;
    }

    function getEntries() {
      return buildEntries();
    }

    return {
      consume,
      toggleThinking,
      toggleRevision,
      setDisplayMode,
      getDisplayMode,
      getEntries,
    };
  }

  window.SkillRunnerThinkingChatCore = {
    createThinkingChatModel,
    normalizeText,
  };
})();
