import { getRuntimePersistencePaths } from "../runtimePersistence";
import { createSynthesisRepository } from "../synthesis/repository";
import { createSynthesisService } from "../synthesis/service";
import { createReadonlySqliteAdapter } from "./sqliteReadonly";
import { createZoteroReadonlyLibraryAdapter } from "./zoteroReadonlyLibraryAdapter";

export type SynthesisReadonlyServiceOptions = {
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

export async function createSynthesisReadonlyService(
  options: SynthesisReadonlyServiceOptions,
) {
  const libraryId = Math.max(1, Math.floor(Number(options.libraryId || 1)));
  installReadonlyZoteroHostMock(libraryId);
  const sqliteAdapter = await createReadonlySqliteAdapter(
    options.synthesisDbPath || options.pluginDbPath,
  );
  const libraryAdapter = await createZoteroReadonlyLibraryAdapter({
    dbPath: options.zoteroDbPath,
    libraryId,
  });
  const paths = getRuntimePersistencePaths(options.pluginRuntimeRoot);
  const repository = createSynthesisRepository({
    adapter: sqliteAdapter,
  });
  const service = createSynthesisService({
    root: paths.dataDir,
    runtimeRoot: options.pluginRuntimeRoot,
    libraryId,
    libraryAdapter,
    synthesisRepository: repository,
  });
  return {
    service,
    close() {
      sqliteAdapter.close();
      libraryAdapter.close();
    },
  };
}
