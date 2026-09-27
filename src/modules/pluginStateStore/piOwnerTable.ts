import type { SqlAdapter } from "./core";

export type PiOwnerRegistryRow = {
  ownerKind: "conversation" | "skill_run";
  ownerId: string;
  entryCount: number;
  lastSequence: number;
  updatedAt: string;
};

export function ensurePiOwnerRegistrySchema(db: SqlAdapter) {
  db.run(`CREATE TABLE IF NOT EXISTS pi_owner_registry (
    owner_kind TEXT NOT NULL CHECK(owner_kind IN ('conversation', 'skill_run')),
    owner_id TEXT NOT NULL,
    entry_count INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(owner_kind, owner_id)
  )`);
}

export function createPiOwnerRegistryTable(getAdapter: () => SqlAdapter) {
  return {
    upsertPiOwnerRegistry(row: PiOwnerRegistryRow) {
      getAdapter().run(
        `INSERT INTO pi_owner_registry
        (owner_kind, owner_id, entry_count, last_sequence, updated_at)
        VALUES (@kind, @id, @count, @seq, @updated)
        ON CONFLICT(owner_kind, owner_id) DO UPDATE SET
          entry_count=excluded.entry_count,
          last_sequence=excluded.last_sequence,
          updated_at=excluded.updated_at`,
        {
          kind: row.ownerKind,
          id: row.ownerId,
          count: row.entryCount,
          seq: row.lastSequence,
          updated: row.updatedAt,
        },
      );
    },
    getPiOwnerRegistry(
      kind: PiOwnerRegistryRow["ownerKind"],
      id: string,
    ): PiOwnerRegistryRow | null {
      const row = getAdapter().get(
        `SELECT owner_kind, owner_id, entry_count, last_sequence, updated_at
        FROM pi_owner_registry WHERE owner_kind=@kind AND owner_id=@id`,
        { kind, id },
      );
      return row
        ? {
            ownerKind: String(
              row.owner_kind,
            ) as PiOwnerRegistryRow["ownerKind"],
            ownerId: String(row.owner_id),
            entryCount: Number(row.entry_count),
            lastSequence: Number(row.last_sequence),
            updatedAt: String(row.updated_at),
          }
        : null;
    },
  };
}
