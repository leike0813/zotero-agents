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
