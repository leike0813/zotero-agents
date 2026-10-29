export type WorkflowStoredAttachmentImportRequest = {
  path: string;
  targetFilename?: string | null;
  defaultMetadata?: { title?: string; contentType?: string };
  companionFiles?: Array<{ sourcePath: string; relativePath: string }>;
};

export type WorkflowStagedAttachmentSources = {
  stagingDirectory: string;
  mainFilename: string;
  stagedMainPath: string;
  entries: Array<{ relativePath: string; stagedPath: string }>;
  cleanup(): Promise<void>;
};

export {
  createZoteroHostPreparedFileStager as createWorkflowStoredAttachmentStager,
  WorkflowStoredAttachmentInputError,
} from "../modules/zoteroHost/zoteroHostPreparedFiles";
