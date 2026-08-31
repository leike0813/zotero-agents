import { createSynthesisClientFromPort } from "../synthesisClient/clientPortAdapter";
import { createReadonlySqliteDatabase } from "./sqliteReadonly";
import { createSynthesisReadonlyPort } from "./synthesisReadonlyPort";
import { createZoteroReadonlyHostReadPort } from "./zoteroReadonlyLibraryAdapter";

export type SynthesisReadonlyClientOptions = {
  zoteroDbPath: string;
  pluginDbPath: string;
  synthesisDbPath?: string;
  pluginRuntimeRoot: string;
  libraryId?: number;
};

function installReadonlyZoteroHostMock(libraryId: number) {
  const runtime = globalThis as any;
  const zotero = (runtime.Zotero ||= {});
  const libraries = (zotero.Libraries ||= {});
  libraries.userLibraryID ||= libraryId;
  zotero.debug ||= () => undefined;
  const prefs = (zotero.Prefs ||= {});
  prefs.get ||= () => undefined;
  prefs.set ||= () => {
    throw new Error("Readonly harness blocked Zotero.Prefs.set");
  };
  prefs.clear ||= () => {
    throw new Error("Readonly harness blocked Zotero.Prefs.clear");
  };
}

export async function createSynthesisReadonlyClient(
  options: SynthesisReadonlyClientOptions,
) {
  const libraryId = Math.max(1, Math.floor(Number(options.libraryId || 1)));
  installReadonlyZoteroHostMock(libraryId);
  const database = await createReadonlySqliteDatabase(
    options.synthesisDbPath || options.pluginDbPath,
  );
  try {
    const hostReadPort = await createZoteroReadonlyHostReadPort({
      dbPath: options.zoteroDbPath,
      libraryId,
    });
    try {
      const client = createSynthesisClientFromPort(
        createSynthesisReadonlyPort({ database, libraryId }),
      );
      let closed = false;
      return {
        client,
        close() {
          if (closed) return;
          closed = true;
          hostReadPort.close();
          database.close();
        },
      };
    } catch (error) {
      hostReadPort.close();
      throw error;
    }
  } catch (error) {
    database.close();
    throw error;
  }
}
