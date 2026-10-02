const SKILL_RUN_SCALAR_COLUMNS = [
    ["task_name", "TEXT"],
    ["skill_id", "TEXT"],
    ["status", "TEXT"],
    ["archived", "INTEGER NOT NULL DEFAULT 0"],
    ["count_user", "INTEGER NOT NULL DEFAULT 0"],
    ["count_assistant", "INTEGER NOT NULL DEFAULT 0"],
    ["count_tool", "INTEGER NOT NULL DEFAULT 0"],
    ["count_thought", "INTEGER NOT NULL DEFAULT 0"],
    ["reservation_json", "TEXT"],
];
export function ensurePiOwnerRegistrySchema(db) {
    db.run(`CREATE TABLE IF NOT EXISTS pi_owner_registry (
    owner_kind TEXT NOT NULL CHECK(owner_kind IN ('conversation', 'skill_run')),
    owner_id TEXT NOT NULL,
    entry_count INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    task_name TEXT,
    skill_id TEXT,
    status TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    count_user INTEGER NOT NULL DEFAULT 0,
    count_assistant INTEGER NOT NULL DEFAULT 0,
    count_tool INTEGER NOT NULL DEFAULT 0,
    count_thought INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_kind, owner_id)
  )`);
    const columns = new Set(db
        .all("PRAGMA table_info(pi_owner_registry)")
        .map((row) => String(row.name)));
    for (const [name, definition] of SKILL_RUN_SCALAR_COLUMNS) {
        if (!columns.has(name)) {
            db.run(`ALTER TABLE pi_owner_registry ADD COLUMN ${name} ${definition}`);
        }
    }
}
const REGISTRY_SELECT_COLUMNS = "owner_kind, owner_id, entry_count, last_sequence, updated_at, task_name, skill_id, status, archived, count_user, count_assistant, count_tool, count_thought, reservation_json";
function parseReservationColumn(value) {
    if (value === null || value === undefined)
        return undefined;
    try {
        const parsed = JSON.parse(String(value));
        return parsed && typeof parsed === "object" ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
function toRegistryRow(row) {
    const ownerKind = String(row.owner_kind);
    const reservation = parseReservationColumn(row.reservation_json);
    return {
        ownerKind,
        ownerId: String(row.owner_id),
        entryCount: Number(row.entry_count),
        lastSequence: Number(row.last_sequence),
        updatedAt: String(row.updated_at),
        ...(reservation ? { reservation } : {}),
        ...(ownerKind === "skill_run"
            ? {
                skillRun: {
                    taskName: String(row.task_name ?? ""),
                    skillId: String(row.skill_id ?? ""),
                    status: String(row.status ?? "queued"),
                    archived: Number(row.archived ?? 0) === 1,
                    counts: {
                        user: Number(row.count_user ?? 0),
                        assistant: Number(row.count_assistant ?? 0),
                        tool: Number(row.count_tool ?? 0),
                        thought: Number(row.count_thought ?? 0),
                    },
                },
            }
            : {}),
    };
}
export function createPiOwnerRegistryTable(getAdapter) {
    return {
        upsertPiOwnerRegistry(row) {
            const scalars = row.skillRun;
            const reservation = row.reservation;
            getAdapter().run(`INSERT INTO pi_owner_registry
        (owner_kind, owner_id, entry_count, last_sequence, updated_at,
          task_name, skill_id, status, archived,
          count_user, count_assistant, count_tool, count_thought, reservation_json)
        VALUES (@kind, @id, @count, @seq, @updated,
          @taskName, @skillId, @status, @archived,
          @countUser, @countAssistant, @countTool, @countThought, @reservation)
        ON CONFLICT(owner_kind, owner_id) DO UPDATE SET
          entry_count=excluded.entry_count,
          last_sequence=excluded.last_sequence,
          updated_at=excluded.updated_at,
          task_name=excluded.task_name,
          skill_id=excluded.skill_id,
          status=excluded.status,
          archived=excluded.archived,
          count_user=excluded.count_user,
          count_assistant=excluded.count_assistant,
          count_tool=excluded.count_tool,
          count_thought=excluded.count_thought,
          reservation_json=excluded.reservation_json`, {
                kind: row.ownerKind,
                id: row.ownerId,
                count: row.entryCount,
                seq: row.lastSequence,
                updated: row.updatedAt,
                taskName: scalars?.taskName ?? null,
                skillId: scalars?.skillId ?? null,
                status: scalars?.status ?? null,
                archived: scalars?.archived ? 1 : 0,
                countUser: scalars?.counts.user ?? 0,
                countAssistant: scalars?.counts.assistant ?? 0,
                countTool: scalars?.counts.tool ?? 0,
                countThought: scalars?.counts.thought ?? 0,
                reservation: reservation ? JSON.stringify(reservation) : null,
            });
        },
        getPiOwnerRegistry(kind, id) {
            const row = getAdapter().get(`SELECT ${REGISTRY_SELECT_COLUMNS}
        FROM pi_owner_registry WHERE owner_kind=@kind AND owner_id=@id`, { kind, id });
            return row ? toRegistryRow(row) : null;
        },
        listPiOwnerRegistry(kind) {
            return getAdapter()
                .all(`SELECT ${REGISTRY_SELECT_COLUMNS} FROM pi_owner_registry WHERE owner_kind=@kind ORDER BY updated_at DESC, owner_id ASC`, { kind })
                .map(toRegistryRow);
        },
        /**
         * Cheap list projection: bounded scalar facts only, no transcript hydrate.
         */
        listPiSkillRunRegistry() {
            return getAdapter()
                .all(`SELECT ${REGISTRY_SELECT_COLUMNS} FROM pi_owner_registry
          WHERE owner_kind='skill_run' ORDER BY updated_at DESC, owner_id ASC`)
                .map((row) => {
                const parsed = toRegistryRow(row);
                const scalars = parsed.skillRun;
                return {
                    requestId: parsed.ownerId,
                    entryCount: parsed.entryCount,
                    lastSequence: parsed.lastSequence,
                    updatedAt: parsed.updatedAt,
                    ...scalars,
                };
            });
        },
        deletePiOwnerRegistry(kind, id) {
            getAdapter().run(`DELETE FROM pi_owner_registry WHERE owner_kind=@kind AND owner_id=@id`, { kind, id });
        },
    };
}
const METADATA_SCALAR_COLUMNS = [
    ["message_user_count", "INTEGER NOT NULL DEFAULT 0"],
    ["message_assistant_count", "INTEGER NOT NULL DEFAULT 0"],
    ["tool_result_count", "INTEGER NOT NULL DEFAULT 0"],
    ["thought_count", "INTEGER NOT NULL DEFAULT 0"],
    ["other_count", "INTEGER NOT NULL DEFAULT 0"],
    ["context_revision", "INTEGER NOT NULL DEFAULT 0"],
    ["active_leaf", "TEXT"],
    ["latest_turn_id", "TEXT"],
    ["latest_turn_status", "TEXT"],
    ["usage_json", "TEXT"],
    ["usage_totals_json", "TEXT"],
];
export function ensurePiConversationMetadataSchema(db) {
    db.run(`CREATE TABLE IF NOT EXISTS pi_conversation_metadata (
    conversation_id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    title_source TEXT NOT NULL DEFAULT 'default',
    title_revision INTEGER NOT NULL DEFAULT 0,
    lifecycle TEXT NOT NULL DEFAULT 'active',
    selection TEXT,
    generation INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
    const columns = new Set(db
        .all("PRAGMA table_info(pi_conversation_metadata)")
        .map((row) => String(row.name)));
    for (const [name, definition] of METADATA_SCALAR_COLUMNS) {
        if (!columns.has(name)) {
            db.run(`ALTER TABLE pi_conversation_metadata ADD COLUMN ${name} ${definition}`);
        }
    }
    db.run(`CREATE TABLE IF NOT EXISTS pi_conversation_cleanup_receipts (
    conversation_id TEXT PRIMARY KEY,
    generation INTEGER NOT NULL,
    cleaned_at TEXT NOT NULL
  )`);
    // Minimal Skill Run deletion receipt: the same evidence Conversation
    // cleanup keeps, so a crash between removal and completion still has a
    // durable answer. It carries no transcript payload.
    db.run(`CREATE TABLE IF NOT EXISTS pi_skill_run_cleanup_receipts (
    request_id TEXT PRIMARY KEY,
    cleaned_at TEXT NOT NULL
  )`);
}
function parseJsonColumn(value) {
    if (value === null || value === undefined)
        return null;
    try {
        return JSON.parse(String(value));
    }
    catch {
        return null;
    }
}
function nullableText(value) {
    if (value === null || value === undefined)
        return null;
    const text = String(value);
    return text === "" ? null : text;
}
const METADATA_COLUMNS = "conversation_id, title, title_source, title_revision, lifecycle, selection, generation, created_at, updated_at";
function toMetadata(row) {
    return {
        conversationId: String(row.conversation_id),
        title: String(row.title ?? ""),
        titleSource: String(row.title_source ?? "default"),
        titleRevision: Number(row.title_revision ?? 0),
        lifecycle: String(row.lifecycle ?? "active"),
        selection: row.selection === null || row.selection === undefined
            ? null
            : String(row.selection),
        generation: Number(row.generation ?? 1),
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? ""),
    };
}
export function createPiConversationMetadataTables(getAdapter) {
    return {
        insertPiConversationMetadata(row) {
            // The host adapter binds one value per distinct named parameter, so a
            // name must never appear twice in one statement.
            getAdapter().run(`INSERT INTO pi_conversation_metadata
        (conversation_id, title, title_source, title_revision, lifecycle, selection, generation, created_at, updated_at)
        VALUES (@id, '', 'default', 0, 'active', NULL, 1, @created, @updated)
        ON CONFLICT(conversation_id) DO NOTHING`, {
                id: row.conversationId,
                created: row.createdAt,
                updated: row.createdAt,
            });
        },
        getPiConversationMetadata(conversationId) {
            const row = getAdapter().get(`SELECT ${METADATA_COLUMNS} FROM pi_conversation_metadata WHERE conversation_id=@id`, { id: conversationId });
            return row ? toMetadata(row) : null;
        },
        listPiConversations(options = {}) {
            const lifecycles = Array.from(new Set(options.lifecycles || [])).filter((value) => Boolean(value));
            const order = "ORDER BY updated_at DESC, conversation_id ASC";
            if (!lifecycles.length) {
                return getAdapter()
                    .all(`SELECT ${METADATA_COLUMNS} FROM pi_conversation_metadata ${order}`)
                    .map(toMetadata);
            }
            const params = {};
            lifecycles.forEach((value, index) => {
                params[`lifecycle${index}`] = value;
            });
            const placeholders = lifecycles
                .map((_, index) => `@lifecycle${index}`)
                .join(", ");
            return getAdapter()
                .all(`SELECT ${METADATA_COLUMNS} FROM pi_conversation_metadata WHERE lifecycle IN (${placeholders}) ${order}`, params)
                .map(toMetadata);
        },
        updatePiConversationMetadata(conversationId, expected, next) {
            const adapter = getAdapter();
            return adapter.transaction(() => {
                const row = adapter.get(`SELECT ${METADATA_COLUMNS} FROM pi_conversation_metadata WHERE conversation_id=@id`, { id: conversationId });
                if (!row)
                    return null;
                const current = toMetadata(row);
                for (const [key, value] of Object.entries(expected)) {
                    if (current[key] !== value)
                        return null;
                }
                adapter.run(`UPDATE pi_conversation_metadata SET
            title=@title,
            title_source=@titleSource,
            title_revision=@titleRevision,
            lifecycle=@lifecycle,
            selection=@selection,
            generation=@generation,
            updated_at=@updatedAt
          WHERE conversation_id=@id`, {
                    id: conversationId,
                    title: next.title,
                    titleSource: next.titleSource,
                    titleRevision: next.titleRevision,
                    lifecycle: next.lifecycle,
                    selection: next.selection,
                    generation: next.generation,
                    updatedAt: next.updatedAt,
                });
                return next;
            });
        },
        deletePiConversationMetadata(conversationId) {
            getAdapter().run(`DELETE FROM pi_conversation_metadata WHERE conversation_id=@id`, { id: conversationId });
        },
        getPiConversationCleanupReceipt(conversationId) {
            const row = getAdapter().get(`SELECT conversation_id, generation, cleaned_at
        FROM pi_conversation_cleanup_receipts WHERE conversation_id=@id`, { id: conversationId });
            return row
                ? {
                    conversationId: String(row.conversation_id),
                    generation: Number(row.generation ?? 0),
                    cleanedAt: String(row.cleaned_at ?? ""),
                }
                : null;
        },
        upsertPiConversationCleanupReceipt(receipt) {
            getAdapter().run(`INSERT INTO pi_conversation_cleanup_receipts
        (conversation_id, generation, cleaned_at)
        VALUES (@id, @generation, @cleanedAt)
        ON CONFLICT(conversation_id) DO UPDATE SET
          generation=excluded.generation,
          cleaned_at=excluded.cleaned_at`, {
                id: receipt.conversationId,
                generation: receipt.generation,
                cleanedAt: receipt.cleanedAt,
            });
        },
        getPiSkillRunCleanupReceipt(requestId) {
            const row = getAdapter().get(`SELECT request_id, cleaned_at FROM pi_skill_run_cleanup_receipts
        WHERE request_id=@id`, { id: requestId });
            return row
                ? {
                    requestId: String(row.request_id),
                    cleanedAt: String(row.cleaned_at ?? ""),
                }
                : null;
        },
        upsertPiSkillRunCleanupReceipt(receipt) {
            getAdapter().run(`INSERT INTO pi_skill_run_cleanup_receipts (request_id, cleaned_at)
        VALUES (@id, @cleanedAt)
        ON CONFLICT(request_id) DO UPDATE SET cleaned_at=excluded.cleaned_at`, { id: receipt.requestId, cleanedAt: receipt.cleanedAt });
        },
        updatePiConversationProjection(conversationId, projection) {
            getAdapter().run(`UPDATE pi_conversation_metadata SET
          message_user_count=@user,
          message_assistant_count=@assistant,
          tool_result_count=@tool,
          thought_count=@thought,
          other_count=@other,
          context_revision=@revision,
          active_leaf=@activeLeaf,
          latest_turn_id=@latestTurnId,
          latest_turn_status=@latestTurnStatus,
          usage_json=@usage,
          usage_totals_json=@usageTotals
        WHERE conversation_id=@id`, {
                id: conversationId,
                user: projection.counts.user,
                assistant: projection.counts.assistant,
                tool: projection.counts.tool,
                thought: projection.counts.thought,
                other: projection.counts.other,
                revision: projection.contextRevision,
                activeLeaf: projection.activeLeaf,
                latestTurnId: projection.latestTurnId,
                latestTurnStatus: projection.latestTurnStatus,
                usage: projection.usage === null ? null : JSON.stringify(projection.usage),
                usageTotals: JSON.stringify(projection.usageTotals),
            });
        },
        getPiConversationReadFacts(conversationId) {
            const row = getAdapter().get(`SELECT conversation_id, lifecycle, generation, context_revision,
          active_leaf, latest_turn_id, latest_turn_status, message_user_count,
          message_assistant_count, tool_result_count, thought_count,
          other_count, usage_json, usage_totals_json
        FROM pi_conversation_metadata WHERE conversation_id=@id`, { id: conversationId });
            if (!row)
                return null;
            const totals = parseJsonColumn(row.usage_totals_json);
            return {
                conversationId: String(row.conversation_id),
                lifecycle: String(row.lifecycle ?? "active"),
                generation: Number(row.generation ?? 1),
                contextRevision: Number(row.context_revision ?? 0),
                // The host adapter stores a bound null as an empty string, so an empty
                // value is a null scalar on every host.
                activeLeaf: nullableText(row.active_leaf),
                latestTurnId: nullableText(row.latest_turn_id),
                latestTurnStatus: nullableText(row.latest_turn_status),
                counts: {
                    user: Number(row.message_user_count ?? 0),
                    assistant: Number(row.message_assistant_count ?? 0),
                    tool: Number(row.tool_result_count ?? 0),
                    thought: Number(row.thought_count ?? 0),
                    other: Number(row.other_count ?? 0),
                },
                usage: parseJsonColumn(row.usage_json),
                usageTotals: totals && typeof totals === "object" && !Array.isArray(totals)
                    ? totals
                    : {},
            };
        },
    };
}
