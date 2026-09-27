import { readUiVisibleTranscriptPage } from "./assistantTranscriptPageProjection";
import type { AssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";
import {
  createAssistantWorkspaceTranscriptMutation,
  type AssistantWorkspaceTranscriptBoundary,
  type AssistantWorkspaceTranscriptMutationEvent,
} from "./assistantWorkspaceTranscriptPublication";

export type AssistantTranscriptMirrorEventOp =
  | "upsert_item"
  | "append_text"
  | "patch_item"
  | "delete_item";

export type AssistantTranscriptMirrorItem = {
  id: string;
  kind: string;
  createdAt?: string;
};

// Core mirror state hosted by the owner driver (chat session runtime,
// skill-run live state). The generic store mutates this handle in place;
// it never owns a global mirror map. Optional fields are owner-specific:
// chat keeps an in-state preview and the (vestigial) per-owner write sets,
// skill runs keep neither.
export type AssistantTranscriptMirrorCoreState<
  TItem extends AssistantTranscriptMirrorItem,
> = {
  transcriptItemsById: Map<string, TItem>;
  transcriptItemIds: string[];
  transcriptItemCount: number;
  transcriptEventSeq: number;
  transcriptMirrorLoaded: boolean;
  transcriptHydrateState?: "loading" | "failed";
  transcriptHydrateError?: string;
  transcriptHydratePromise?: Promise<void>;
  transcriptPreview?: string;
  transcriptWrites?: Set<Promise<unknown>>;
  transcriptMirrorReleasePromise?: Promise<void>;
  workspaceTranscriptEvents: AssistantWorkspaceTranscriptMutationEvent[];
};

export type AssistantTranscriptMirrorQueueArgs<
  TItem extends AssistantTranscriptMirrorItem,
> = {
  op: AssistantTranscriptMirrorEventOp;
  itemId: string;
  item?: TItem;
  text?: string;
  patch?: Partial<TItem>;
  createdAt: string;
  newItem?: boolean;
  textPreview?: string;
  boundary?: AssistantWorkspaceTranscriptBoundary;
};

export type AssistantTranscriptMirrorStreamingChannel = "assistant" | "thought";

// Per-source variation for the mirror store. Keyed by owner *source* only —
// implementations must never branch on backend id, provider id, agent
// family, command name, or product strings. TState is the owner state
// handle; `core` projects it to the generic mirror fields, so owners may
// wrap extra context (for example the skill-run record) around the mirror
// state without giving up the shared machinery.
export type AssistantTranscriptMirrorOwnerDescriptor<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
> = {
  core(state: TState): AssistantTranscriptMirrorCoreState<TItem>;
  ownerKey(state: TState): string;
  isLive(state: TState): boolean;
  isForeground(state: TState): boolean;
  resolveOwnerState(ownerKey: string): TState | undefined;
  listOwnerStates(): Iterable<TState>;
  hasOwner(state: TState): boolean;
  cloneItem(item: TItem): TItem;
  previewFromItem(item: TItem): string | undefined;
  appendTextToItem(
    item: TItem,
    text: string,
    createdAt?: string,
  ): TItem | undefined;
  allocateItemId(state: TState, prefix: string): string;
  itemOrdinal?(itemId: string): number;
  streaming: {
    textItemIdPrefix(
      channel: AssistantTranscriptMirrorStreamingChannel,
    ): string;
    getActiveTextItemId(
      state: TState,
      channel: AssistantTranscriptMirrorStreamingChannel,
    ): string;
    getContinuationTextItemId(
      state: TState,
      channel: AssistantTranscriptMirrorStreamingChannel,
      role?: string,
    ): string;
    setActiveTextItemId(
      state: TState,
      channel: AssistantTranscriptMirrorStreamingChannel,
      itemId: string,
      role?: string,
    ): void;
    createStreamingTextItem(
      state: TState,
      args: {
        channel: AssistantTranscriptMirrorStreamingChannel;
        role?: string;
        text: string;
        id: string;
        createdAt: string;
      },
    ): TItem;
  };
  plan: {
    mode: "transcript-item" | "external";
    getActivePlanItemId?(state: TState): string;
    setActivePlanItemId?(state: TState, itemId: string): void;
    finalizePlanItemPatch?(
      item: TItem,
      terminalStatus: "cancelled" | "skipped",
    ): Partial<TItem>;
  };
  continuity?: {
    rememberLoadedItem?(state: TState, item: TItem): void;
    rememberItem?(state: TState, item: TItem): void;
    forgetItem?(state: TState, item: TItem): void;
    resetMirrorState(state: TState): void;
  };
  // Skills-only branch for events that arrive while the mirror is cold.
  // The hook applies owner metadata, then either fully handles the event
  // (persist + needsHydrate, no mirror/mutation) or lets the generic flow
  // continue without re-applying metadata. Chat leaves this unset.
  queueEventWhileMirrorCold?(
    state: TState,
    args: AssistantTranscriptMirrorQueueArgs<TItem>,
  ): "handled" | "continue";
  prepareMirrorForEvent?(state: TState): void;
  resolveLoadedCounters?(
    state: TState,
    args: { itemCount: number; eventSeq: number; maxItemOrdinal: number },
  ): { itemCount: number; eventSeq: number };
  syncEventMetadata(
    state: TState,
    args: {
      item?: TItem;
      text?: string;
      textPreview?: string;
      newItem?: boolean;
    },
  ): void;
  syncLoadedMetadata(
    state: TState,
    args: { preview: string | undefined },
  ): void;
  onMirrorForceReleased(state: TState): void;
  shouldReleaseOnEvict?(state: TState): boolean;
  persistEvent(
    state: TState,
    args: AssistantTranscriptMirrorQueueArgs<TItem>,
  ): void;
  flushWrites(state: TState): Promise<unknown>;
  shouldFlushWritesBeforeHydrate?(state: TState): boolean;
  readFullTranscript(
    state: TState,
  ): Promise<{ items: TItem[]; eventSeq: number }>;
  shouldSkipHydrate?(state: TState): boolean;
  onMirrorHydrated?(state: TState): void;
  onHydrateWaitingForWrites?(state: TState, pendingCount: number): void;
  onHydrateFailed?(state: TState, error: unknown): void;
  onHydrateSettled?(state: TState): void;
  onHydrateCompleted?(state: TState): void;
  errorText(error: unknown): string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeMirrorItemId(value: unknown) {
  return String(value || "").trim();
}

export function applyAssistantTranscriptMirrorEvent<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  args: {
    op: AssistantTranscriptMirrorEventOp;
    itemId: string;
    item?: TItem;
    text?: string;
    patch?: Partial<TItem>;
    createdAt?: string;
  },
) {
  const core = descriptor.core(state);
  const itemId = normalizeMirrorItemId(args.itemId);
  if (!itemId) {
    return;
  }
  if (args.op === "upsert_item" && args.item) {
    const cloned = descriptor.cloneItem(args.item);
    if (!core.transcriptItemsById.has(itemId)) {
      core.transcriptItemIds.push(itemId);
    }
    core.transcriptItemsById.set(itemId, cloned);
    descriptor.continuity?.rememberItem?.(state, cloned);
    return;
  }
  if (args.op === "append_text") {
    const current = core.transcriptItemsById.get(itemId);
    const next = current
      ? descriptor.appendTextToItem(
          current,
          String(args.text || ""),
          args.createdAt,
        )
      : undefined;
    if (next) {
      core.transcriptItemsById.set(itemId, next);
    }
    return;
  }
  if (args.op === "patch_item" && args.patch) {
    const current = core.transcriptItemsById.get(itemId);
    if (!current) {
      return;
    }
    const next = {
      ...current,
      ...args.patch,
      id: current.id,
      kind: current.kind,
    } as TItem;
    core.transcriptItemsById.set(itemId, next);
    descriptor.continuity?.rememberItem?.(state, next);
    return;
  }
  if (args.op === "delete_item") {
    const current = core.transcriptItemsById.get(itemId);
    if (current) {
      descriptor.continuity?.forgetItem?.(state, current);
    }
    core.transcriptItemsById.delete(itemId);
    core.transcriptItemIds = core.transcriptItemIds.filter(
      (id) => id !== itemId,
    );
  }
}

export function resetAssistantTranscriptMirror<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
) {
  const core = descriptor.core(state);
  core.transcriptItemsById.clear();
  core.transcriptItemIds = [];
  core.workspaceTranscriptEvents = [];
  descriptor.continuity?.resetMirrorState(state);
}

export function loadAssistantTranscriptMirrorFromItems<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  args: { items: TItem[]; eventSeq: number },
) {
  const core = descriptor.core(state);
  resetAssistantTranscriptMirror(state, descriptor);
  let maxItemOrdinal = 0;
  for (const item of args.items) {
    const cloned = descriptor.cloneItem(item);
    if (!core.transcriptItemsById.has(cloned.id)) {
      core.transcriptItemIds.push(cloned.id);
    }
    core.transcriptItemsById.set(cloned.id, cloned);
    maxItemOrdinal = Math.max(
      maxItemOrdinal,
      descriptor.itemOrdinal?.(cloned.id) ?? 0,
    );
    descriptor.continuity?.rememberLoadedItem?.(state, cloned);
  }
  const counters = descriptor.resolveLoadedCounters
    ? descriptor.resolveLoadedCounters(state, {
        itemCount: args.items.length,
        eventSeq: Number(args.eventSeq) || 0,
        maxItemOrdinal,
      })
    : {
        itemCount: args.items.length,
        eventSeq: Math.max(0, Number(args.eventSeq) || 0),
      };
  core.transcriptItemCount = counters.itemCount;
  core.transcriptEventSeq = counters.eventSeq;
  const preview = args.items
    .slice()
    .reverse()
    .map((item) => descriptor.previewFromItem(item))
    .find((text) => !!text);
  descriptor.syncLoadedMetadata(state, { preview });
  core.transcriptMirrorLoaded = true;
  core.transcriptHydrateState = undefined;
  core.transcriptHydrateError = undefined;
}

export function queueAssistantTranscriptMirrorEvent<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  args: AssistantTranscriptMirrorQueueArgs<TItem>,
) {
  const core = descriptor.core(state);
  let metadataApplied = false;
  if (!core.transcriptMirrorLoaded && descriptor.queueEventWhileMirrorCold) {
    metadataApplied = true;
    if (descriptor.queueEventWhileMirrorCold(state, args) === "handled") {
      return;
    }
  }
  const previousItem = core.transcriptItemsById.get(args.itemId);
  descriptor.prepareMirrorForEvent?.(state);
  applyAssistantTranscriptMirrorEvent(state, descriptor, args);
  if (!metadataApplied) {
    if (args.newItem) {
      core.transcriptItemCount += 1;
    }
    core.transcriptEventSeq += 1;
    descriptor.syncEventMetadata(state, {
      item: args.item,
      text: args.text,
      textPreview: args.textPreview,
      newItem: args.newItem,
    });
  }
  const currentItem = core.transcriptItemsById.get(args.itemId);
  const mutation = createAssistantWorkspaceTranscriptMutation({
    op: args.op,
    itemId: args.itemId,
    beforeItem: previousItem as unknown as Record<string, unknown> | undefined,
    afterItem: currentItem as unknown as Record<string, unknown> | undefined,
    text: args.text,
  });
  if (mutation) {
    core.workspaceTranscriptEvents.push({
      boundary: args.boundary || "hard-boundary",
      mutation,
      cardinality:
        !previousItem && currentItem
          ? "insert"
          : previousItem && !currentItem
            ? "delete"
            : "retain",
    });
  }
  descriptor.persistEvent(state, args);
}

export function upsertTranscriptMirrorItem<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  item: TItem,
  boundary?: AssistantWorkspaceTranscriptBoundary,
) {
  queueAssistantTranscriptMirrorEvent(state, descriptor, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: item.createdAt || nowIso(),
    newItem: true,
    boundary,
  });
}

export function patchTranscriptMirrorItem<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  itemId: string,
  patch: Partial<TItem>,
  boundary?: AssistantWorkspaceTranscriptBoundary,
  createdAt?: string,
) {
  queueAssistantTranscriptMirrorEvent(state, descriptor, {
    op: "patch_item",
    itemId,
    patch,
    createdAt: createdAt || nowIso(),
    boundary,
  });
}

export function appendTranscriptMirrorText<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  item: TItem,
  text: string,
) {
  queueAssistantTranscriptMirrorEvent(state, descriptor, {
    op: "append_text",
    itemId: item.id,
    text,
    createdAt: nowIso(),
    boundary: "text-continuation",
  });
}

export function completeActiveStreamingMirrorTextItems<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  args?: { except?: string; now?: string },
) {
  const updatedAt = args?.now || nowIso();
  const assistantId = descriptor.streaming.getActiveTextItemId(
    state,
    "assistant",
  );
  if (assistantId && assistantId !== args?.except) {
    patchTranscriptMirrorItem(
      state,
      descriptor,
      assistantId,
      {
        state: "complete",
        updatedAt,
      } as unknown as Partial<TItem>,
      undefined,
      updatedAt,
    );
    descriptor.streaming.setActiveTextItemId(state, "assistant", "");
  }
  const thoughtId = descriptor.streaming.getActiveTextItemId(state, "thought");
  if (thoughtId && thoughtId !== args?.except) {
    patchTranscriptMirrorItem(
      state,
      descriptor,
      thoughtId,
      {
        state: "complete",
        updatedAt,
      } as unknown as Partial<TItem>,
      undefined,
      updatedAt,
    );
    descriptor.streaming.setActiveTextItemId(state, "thought", "");
  }
}

export function appendStreamingTranscriptMirrorText<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  args: {
    channel: AssistantTranscriptMirrorStreamingChannel;
    role?: string;
    text: string;
    createdAt?: string;
    textPreview?: string;
  },
) {
  const continuationId = descriptor.streaming.getContinuationTextItemId(
    state,
    args.channel,
    args.role,
  );
  completeActiveStreamingMirrorTextItems(state, descriptor, {
    except: continuationId,
    now: args.createdAt,
  });
  if (continuationId) {
    queueAssistantTranscriptMirrorEvent(state, descriptor, {
      op: "append_text",
      itemId: continuationId,
      text: args.text,
      createdAt: args.createdAt || nowIso(),
      boundary: "text-continuation",
      ...(args.textPreview === undefined
        ? {}
        : { textPreview: args.textPreview }),
    });
    return;
  }
  const createdAt = args.createdAt || nowIso();
  const item = descriptor.streaming.createStreamingTextItem(state, {
    channel: args.channel,
    role: args.role,
    text: args.text,
    id: descriptor.allocateItemId(
      state,
      descriptor.streaming.textItemIdPrefix(args.channel),
    ),
    createdAt,
  });
  descriptor.streaming.setActiveTextItemId(
    state,
    args.channel,
    item.id,
    args.role,
  );
  upsertTranscriptMirrorItem(state, descriptor, item, "text-continuation");
}

export function finalizeStreamingTranscriptMirrorItems<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  finalState: "complete" | "error",
  planTerminalStatus: "cancelled" | "skipped" = "skipped",
) {
  const core = descriptor.core(state);
  const assistantId = descriptor.streaming.getActiveTextItemId(
    state,
    "assistant",
  );
  if (assistantId) {
    patchTranscriptMirrorItem(state, descriptor, assistantId, {
      state: finalState,
      updatedAt: nowIso(),
    } as unknown as Partial<TItem>);
    descriptor.streaming.setActiveTextItemId(state, "assistant", "");
  }
  const thoughtId = descriptor.streaming.getActiveTextItemId(state, "thought");
  if (thoughtId) {
    patchTranscriptMirrorItem(state, descriptor, thoughtId, {
      state: finalState,
      updatedAt: nowIso(),
    } as unknown as Partial<TItem>);
    descriptor.streaming.setActiveTextItemId(state, "thought", "");
  }
  if (descriptor.plan.mode !== "transcript-item") {
    return;
  }
  const planId = descriptor.plan.getActivePlanItemId?.(state) || "";
  if (!planId) {
    return;
  }
  const target = core.transcriptItemsById.get(planId);
  if (target) {
    const patch = descriptor.plan.finalizePlanItemPatch?.(
      target,
      planTerminalStatus,
    );
    if (patch) {
      patchTranscriptMirrorItem(state, descriptor, planId, patch);
    }
  }
  descriptor.plan.setActivePlanItemId?.(state, "");
}

export type AssistantTranscriptMirrorLru<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
> = {
  has(ownerKey: string): boolean;
  size(): number;
  delete(ownerKey: string): void;
  clear(): void;
  touch(state: TState): void;
  forceRelease(state: TState): void;
  prune(): void;
};

export function createAssistantTranscriptMirrorLru<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  options: { limit: number },
): AssistantTranscriptMirrorLru<TItem, TState> {
  const coldMirrorLru = new Map<string, true>();
  const isPinned = (state: TState) =>
    descriptor.isLive(state) || descriptor.isForeground(state);
  const forceRelease = (state: TState) => {
    coldMirrorLru.delete(descriptor.ownerKey(state));
    resetAssistantTranscriptMirror(state, descriptor);
    descriptor.onMirrorForceReleased(state);
  };
  const prune = () => {
    for (const key of Array.from(coldMirrorLru.keys())) {
      const state = descriptor.resolveOwnerState(key);
      if (!state) {
        coldMirrorLru.delete(key);
        continue;
      }
      if (descriptor.isLive(state)) {
        coldMirrorLru.delete(key);
      }
    }
    while (coldMirrorLru.size > options.limit) {
      const key = coldMirrorLru.keys().next().value;
      if (!key) {
        break;
      }
      const state = descriptor.resolveOwnerState(key);
      coldMirrorLru.delete(key);
      if (!state) {
        continue;
      }
      const shouldRelease = descriptor.shouldReleaseOnEvict
        ? descriptor.shouldReleaseOnEvict(state)
        : !isPinned(state);
      if (shouldRelease) {
        forceRelease(state);
      }
    }
  };
  const touch = (state: TState) => {
    const key = descriptor.ownerKey(state);
    if (!key || descriptor.isLive(state)) {
      coldMirrorLru.delete(key);
      return;
    }
    if (!descriptor.core(state).transcriptMirrorLoaded) {
      return;
    }
    coldMirrorLru.delete(key);
    coldMirrorLru.set(key, true);
    prune();
  };
  return {
    has: (ownerKey) => coldMirrorLru.has(ownerKey),
    size: () => coldMirrorLru.size,
    delete: (ownerKey) => {
      coldMirrorLru.delete(ownerKey);
    },
    clear: () => {
      coldMirrorLru.clear();
    },
    touch,
    forceRelease,
    prune,
  };
}

export async function hydrateAssistantTranscriptMirror<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  lru: AssistantTranscriptMirrorLru<TItem, TState>,
) {
  const core = descriptor.core(state);
  const skipHydrate = descriptor.shouldSkipHydrate
    ? descriptor.shouldSkipHydrate(state)
    : core.transcriptMirrorLoaded;
  if (skipHydrate) {
    return;
  }
  if (core.transcriptHydratePromise) {
    await core.transcriptHydratePromise;
    return;
  }
  core.transcriptHydrateState = "loading";
  core.transcriptHydrateError = undefined;
  const hydrate = (async () => {
    const shouldFlush = descriptor.shouldFlushWritesBeforeHydrate
      ? descriptor.shouldFlushWritesBeforeHydrate(state)
      : (core.transcriptWrites?.size ?? 0) > 0;
    if (shouldFlush) {
      descriptor.onHydrateWaitingForWrites?.(
        state,
        core.transcriptWrites?.size ?? 0,
      );
      await descriptor.flushWrites(state);
    }
    const { items, eventSeq } = await descriptor.readFullTranscript(state);
    loadAssistantTranscriptMirrorFromItems(state, descriptor, {
      items,
      eventSeq,
    });
    descriptor.onMirrorHydrated?.(state);
    lru.touch(state);
  })();
  core.transcriptHydratePromise = hydrate;
  try {
    await hydrate;
  } catch (error) {
    core.transcriptHydrateState = "failed";
    core.transcriptHydrateError = descriptor.errorText(error);
    descriptor.onHydrateFailed?.(state, error);
    throw error;
  } finally {
    core.transcriptHydratePromise = undefined;
    descriptor.onHydrateCompleted?.(state);
  }
}

export function scheduleAssistantTranscriptMirrorHydrate<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  lru: AssistantTranscriptMirrorLru<TItem, TState>,
) {
  const core = descriptor.core(state);
  if (
    core.transcriptMirrorLoaded ||
    core.transcriptHydratePromise ||
    !descriptor.hasOwner(state)
  ) {
    return;
  }
  core.transcriptHydrateState = "loading";
  void hydrateAssistantTranscriptMirror(state, descriptor, lru)
    .catch(() => undefined)
    .finally(() => {
      descriptor.onHydrateSettled?.(state);
    });
}

export function releaseIdleBackgroundTranscriptMirror<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  lru: AssistantTranscriptMirrorLru<TItem, TState>,
) {
  const core = descriptor.core(state);
  const key = descriptor.ownerKey(state);
  if (descriptor.isLive(state)) {
    lru.delete(key);
    return;
  }
  if (descriptor.isForeground(state)) {
    lru.touch(state);
    return;
  }
  if (lru.has(key)) {
    return;
  }
  if ((core.transcriptWrites?.size ?? 0) > 0) {
    if (!core.transcriptMirrorReleasePromise) {
      const pending = Array.from(core.transcriptWrites ?? []);
      core.transcriptMirrorReleasePromise = Promise.allSettled(pending)
        .then(() => {
          core.transcriptMirrorReleasePromise = undefined;
          releaseIdleBackgroundTranscriptMirror(state, descriptor, lru);
        })
        .catch(() => {
          core.transcriptMirrorReleasePromise = undefined;
        });
    }
    return;
  }
  lru.forceRelease(state);
}

export function releaseAllIdleBackgroundTranscriptMirrors<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  lru: AssistantTranscriptMirrorLru<TItem, TState>,
) {
  for (const state of descriptor.listOwnerStates()) {
    releaseIdleBackgroundTranscriptMirror(state, descriptor, lru);
  }
}

export function readAssistantTranscriptMirrorPage<
  TItem extends AssistantTranscriptMirrorItem,
  TState,
>(
  state: TState,
  descriptor: AssistantTranscriptMirrorOwnerDescriptor<TItem, TState>,
  lru: AssistantTranscriptMirrorLru<TItem, TState>,
  args: {
    cursor?: number;
    limit?: number;
    executionDisplayMode: AssistantExecutionDisplayMode;
    defaultLimit: number;
    maxLimit: number;
  },
) {
  const core = descriptor.core(state);
  if (!core.transcriptMirrorLoaded) {
    return undefined;
  }
  lru.touch(state);
  return readUiVisibleTranscriptPage<TItem>({
    itemIds: core.transcriptItemIds,
    getItem: (itemId) => core.transcriptItemsById.get(itemId),
    cloneItem: (item) => descriptor.cloneItem(item),
    executionDisplayMode: args.executionDisplayMode,
    cursor: args.cursor,
    limit: args.limit,
    defaultLimit: args.defaultLimit,
    maxLimit: args.maxLimit,
  });
}
