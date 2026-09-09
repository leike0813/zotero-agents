import { DatabaseSync } from "node:sqlite";

import {
  configurePluginStateTestAdapterFactory,
  type SqlAdapter,
} from "../../src/modules/pluginStateStore/core";

function createNodeSqliteAdapter(): SqlAdapter {
  const database = new DatabaseSync(":memory:");
  let transactionDepth = 0;

  return {
    run(sql, params) {
      database.prepare(sql).run(params ?? {});
    },
    all(sql, params) {
      return database.prepare(sql).all(params ?? {}) as Record<
        string,
        unknown
      >[];
    },
    get(sql, params) {
      return (
        (database.prepare(sql).get(params ?? {}) as
          | Record<string, unknown>
          | undefined) ?? null
      );
    },
    transaction(fn) {
      if (transactionDepth > 0) {
        return fn();
      }
      database.exec("BEGIN IMMEDIATE");
      transactionDepth += 1;
      try {
        const result = fn();
        database.exec("COMMIT");
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      } finally {
        transactionDepth -= 1;
      }
    },
    close() {
      database.close();
    },
  };
}

export function installPluginStateNodeSqliteAdapter() {
  configurePluginStateTestAdapterFactory(createNodeSqliteAdapter);
}
