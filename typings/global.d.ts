declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;
declare const resourceURI: string;
declare const rootPath: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";
declare const __debug_mode__: boolean;
declare const __acp_runtime_performance_profiler_enabled__: boolean;
declare const __acp_runtime_semantic_trace_recorder_enabled__: boolean;
declare const __acp_runtime_replay_profiler_enabled__: boolean;
declare const __skillrunner_connection_audit_enabled__: boolean;
declare const __workspace_publication_wire_assert_enabled__: boolean;
declare const __skillrunner_snapshot_wire_assert_enabled__: boolean;
