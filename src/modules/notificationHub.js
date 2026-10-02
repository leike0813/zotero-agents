const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
export const NOTIFICATION_HUB_MAX_EVENTS = 1000;
export const NOTIFICATION_HUB_DISPLAY_SUPPRESSION_WINDOW_MS = 5000;
const events = [];
const eventIdByKey = new Map();
const deliveredCursorByClientId = new Map();
const lastDisplayedAtByGroup = new Map();
let eventCounter = 0;
function normalizeString(value) {
    return String(value || "").trim();
}
function nowIso() {
    return new Date().toISOString();
}
function nextEventId() {
    eventCounter += 1;
    return `hb-notification-${eventCounter}`;
}
function normalizeLimit(limit) {
    if (typeof limit === "number" && Number.isFinite(limit)) {
        return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
    }
    return DEFAULT_LIMIT;
}
function normalizeHandles(handles) {
    const normalized = {};
    for (const [key, value] of Object.entries(handles || {})) {
        const text = normalizeString(value);
        if (text) {
            normalized[key] = text;
        }
    }
    return normalized;
}
function pruneFifo() {
    while (events.length > NOTIFICATION_HUB_MAX_EVENTS) {
        const removed = events.shift();
        if (!removed) {
            continue;
        }
        for (const [key, eventId] of eventIdByKey.entries()) {
            if (eventId === removed.eventId) {
                eventIdByKey.delete(key);
            }
        }
    }
}
function displaySuppressedByGroup(args) {
    const last = lastDisplayedAtByGroup.get(args.displayGroupKey) || 0;
    if (args.windowMs > 0 && args.now - last < args.windowMs) {
        return true;
    }
    lastDisplayedAtByGroup.set(args.displayGroupKey, args.now);
    return false;
}
export function appendNotificationHubEvent(input) {
    const eventKey = normalizeString(input.eventKey);
    const existingEventId = eventKey ? eventIdByKey.get(eventKey) : "";
    if (existingEventId) {
        const existing = events.find((event) => event.eventId === existingEventId);
        if (existing) {
            return { event: existing, shouldDisplay: false, duplicate: true };
        }
        eventIdByKey.delete(eventKey);
    }
    const displayRequested = input.displayRequested !== false;
    const displayGroupKey = normalizeString(input.displayGroupKey);
    const now = Date.now();
    const suppressionWindowMs = Math.max(0, Number(input.suppressionWindowMs ||
        NOTIFICATION_HUB_DISPLAY_SUPPRESSION_WINDOW_MS));
    const suppressed = input.suppressDisplay === true ||
        (displayRequested &&
            !!displayGroupKey &&
            displaySuppressedByGroup({
                displayGroupKey,
                now,
                windowMs: suppressionWindowMs,
            }));
    const event = {
        eventId: nextEventId(),
        type: normalizeString(input.type) || "notification",
        severity: input.severity || "info",
        createdAt: input.createdAt || nowIso(),
        summary: normalizeString(input.summary) ||
            normalizeString(input.text) ||
            "Notification",
        text: normalizeString(input.text) || undefined,
        source: normalizeString(input.source) || undefined,
        owner: normalizeString(input.owner) || undefined,
        scope: normalizeString(input.scope) || undefined,
        semantic: normalizeString(input.semantic) || undefined,
        displayGroupKey: displayGroupKey || undefined,
        dedupKey: normalizeString(input.dedupKey) || undefined,
        relatedHandles: normalizeHandles(input.relatedHandles),
        metadata: input.metadata,
        suppressed,
        acknowledgedAt: null,
    };
    if (eventKey) {
        eventIdByKey.set(eventKey, event.eventId);
    }
    events.push(event);
    pruneFifo();
    return {
        event,
        shouldDisplay: displayRequested && !suppressed,
        duplicate: false,
    };
}
function eventMatches(event, filters) {
    if (filters.type && event.type !== filters.type) {
        return false;
    }
    if (typeof filters.acknowledged === "boolean" &&
        Boolean(event.acknowledgedAt) !== filters.acknowledged) {
        return false;
    }
    if (!filters.includeSuppressed && event.suppressed) {
        return false;
    }
    if (filters.matches && !filters.matches(event)) {
        return false;
    }
    return true;
}
function resolveStart(filters) {
    const clientId = normalizeString(filters.clientId);
    const marker = normalizeString(filters.sinceEventId ||
        (clientId ? deliveredCursorByClientId.get(clientId) : ""));
    if (!marker) {
        return { startIndex: 0, marker: "", truncated: false };
    }
    const index = events.findIndex((event) => event.eventId === marker);
    if (index >= 0) {
        return { startIndex: index + 1, marker, truncated: false };
    }
    return { startIndex: 0, marker, truncated: events.length > 0 };
}
export function listNotificationHubEvents(filters = {}) {
    const limit = normalizeLimit(filters.limit);
    const { startIndex, marker, truncated } = resolveStart(filters);
    const matched = events
        .slice(startIndex)
        .filter((event) => eventMatches(event, filters));
    const notifications = matched.slice(0, limit);
    const last = notifications[notifications.length - 1];
    const clientId = normalizeString(filters.clientId);
    if (clientId && last) {
        deliveredCursorByClientId.set(clientId, last.eventId);
    }
    return {
        notifications,
        nextSinceEventId: last?.eventId || marker || filters.sinceEventId,
        returned: notifications.length,
        hasMore: matched.length > notifications.length,
        truncated,
    };
}
export function acknowledgeNotificationHubEvents(eventIds, clientIdRaw) {
    const acknowledgedAt = nowIso();
    const clientId = normalizeString(clientIdRaw);
    const ids = Array.from(new Set(eventIds.map(normalizeString).filter(Boolean)));
    const acknowledged = [];
    const missing = [];
    for (const eventId of ids) {
        const event = events.find((entry) => entry.eventId === eventId);
        if (!event) {
            missing.push(eventId);
            continue;
        }
        event.acknowledgedAt = acknowledgedAt;
        if (clientId) {
            event.acknowledgedClientIds = {
                ...(event.acknowledgedClientIds || {}),
                [clientId]: acknowledgedAt,
            };
        }
        acknowledged.push(eventId);
    }
    return {
        acknowledged,
        missing,
        acknowledgedAt,
        ...(clientId ? { clientId } : {}),
    };
}
export function resetNotificationHubForTests() {
    events.length = 0;
    eventIdByKey.clear();
    deliveredCursorByClientId.clear();
    lastDisplayedAtByGroup.clear();
    eventCounter = 0;
}
