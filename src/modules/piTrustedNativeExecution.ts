import type { JsonValue } from "../workflows/types";
import type {
  PiGatewayClassification,
  PiGatewayExecution,
  PiGatewayToolDefinition,
} from "./piToolGateway";
import {
  listRuntimeChildrenStrict,
  readRuntimeBytes,
  readRuntimeTextFileStrict,
  replaceRuntimeTextFileAtomically,
  resolveRuntimePathIdentity,
  scanRuntimeUtf8Lines,
  statRuntimePathStrict,
  copyRuntimeFile,
  moveRuntimePath,
  removeRuntimePath,
  runtimePathExists,
  setRuntimeFilePermissions,
  writeRuntimeBytes,
} from "./runtimePersistence";
import { getBaseName, joinPath } from "../utils/path";
import ignore from "ignore";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { resolveRuntimeCommand } from "../platform/command";
import {
  getMozillaSubprocessModule,
  normalizeSubprocessExitCode,
} from "../platform/subprocess";
import {
  appendRuntimeTextFile,
  ensureRuntimeDirectoryStrict,
} from "./runtimePersistence";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "./runtimeFileTransfer";
import { sha256PrefixedHex } from "../utils/sha256";
import { getRuntimeEnvironmentSnapshot } from "../platform/env";

const VISIBLE_BYTES = 50 * 1024;
const VISIBLE_LINES = 2000;
const MAX_EDIT_BYTES = 50 * 1024 * 1024;
const textEncoder = new TextEncoder();
const ownerLocks = new Map<string, Promise<void>>();
type ManagedEntry = {
  sourceKey?: string;
  revisionKey?: string;
  size: number;
  sha256: string;
  name: string;
  kind: "source" | "generated";
};

async function withOwnerLock<T>(
  ownerRoot: string,
  work: () => Promise<T>,
): Promise<T> {
  const prior = ownerLocks.get(ownerRoot) || Promise.resolve();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prior.then(() => pending);
  ownerLocks.set(ownerRoot, tail);
  await prior;
  try {
    return await work();
  } finally {
    release();
    if (ownerLocks.get(ownerRoot) === tail) ownerLocks.delete(ownerRoot);
  }
}

type FileArgs = {
  path: string;
  content?: string;
  offset?: number;
  limit?: number;
  edits?: { oldText: string; newText: string }[];
};
type SearchArgs = {
  path?: string;
  pattern?: string;
  glob?: string;
  ignoreCase?: boolean;
  literal?: boolean;
  context?: number;
  limit?: number;
};

function visibleText(text: string) {
  const lines = text.split("\n");
  const limited = lines.slice(0, VISIBLE_LINES).join("\n");
  const bytes = textEncoder.encode(limited);
  if (bytes.length <= VISIBLE_BYTES)
    return { text: limited, truncated: lines.length > VISIBLE_LINES };
  return {
    text: new TextDecoder().decode(bytes.subarray(0, VISIBLE_BYTES)),
    truncated: true,
  };
}

function visibleTail(text: string) {
  const lines = text.split("\n");
  const limited = lines.slice(-VISIBLE_LINES).join("\n");
  const bytes = textEncoder.encode(limited);
  return {
    text: new TextDecoder().decode(
      bytes.subarray(Math.max(0, bytes.length - VISIBLE_BYTES)),
    ),
    truncated: lines.length > VISIBLE_LINES || bytes.length > VISIBLE_BYTES,
  };
}

function looksBinaryText(text: string) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (
      code === 0xfffd ||
      (code < 32 && code !== 9 && code !== 10 && code !== 13)
    )
      return true;
  }
  return false;
}

function result(value: JsonValue): PiGatewayExecution {
  return { status: "completed", effectCertainty: "confirmed_complete", value };
}

function failure(code: string): PiGatewayExecution {
  return { status: "failed", effectCertainty: "confirmed_none", code };
}

function matchesGlob(pattern: string, value: string) {
  if (!pattern || pattern.length > 256 || value.length > 1024) return false;
  const memo = new Map<string, boolean>();
  function match(i: number, j: number): boolean {
    const key = `${i}:${j}`;
    if (memo.has(key)) return memo.get(key)!;
    let accepted = false;
    if (i === pattern.length) accepted = j === value.length;
    else if (pattern.slice(i, i + 3) === "**/")
      accepted = match(i + 3, j) || (j < value.length && match(i, j + 1));
    else if (pattern.slice(i, i + 2) === "**")
      accepted = match(i + 2, j) || (j < value.length && match(i, j + 1));
    else if (pattern[i] === "*")
      accepted =
        match(i + 1, j) ||
        (j < value.length && value[j] !== "/" && match(i, j + 1));
    else if (pattern[i] === "?")
      accepted = j < value.length && value[j] !== "/" && match(i + 1, j + 1);
    else
      accepted =
        j < value.length && pattern[i] === value[j] && match(i + 1, j + 1);
    memo.set(key, accepted);
    return accepted;
  }
  return match(0, 0);
}

function safeSearchExpression(
  pattern: string,
  literal: boolean,
  ignoreCase: boolean,
) {
  if (
    pattern.length > 128 ||
    (!literal &&
      (/[(){}|]/.test(pattern) ||
        /\\[1-9]/.test(pattern) ||
        (pattern.match(/[?*+]/g)?.length || 0) > 1))
  )
    throw new Error("pi_pattern_unsupported");
  return new RegExp(
    literal ? pattern.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&") : pattern,
    ignoreCase ? "i" : "",
  );
}

const pathSchema = { type: "string", minLength: 1 };
const boundedLimit = (max: number) => ({
  type: "integer",
  minimum: 1,
  maximum: max,
});

export async function createPiTrustedNativeExecution(args: {
  workspaceRoot: string;
  ownerRoot: string;
  mode: "trusted" | "restricted";
}) {
  let root: string;
  try {
    root = (
      await resolveRuntimePathIdentity({
        root: args.workspaceRoot,
        path: args.workspaceRoot,
      })
    ).path;
  } catch (error) {
    if (!String(error).includes("pi_path_inspection_unavailable")) throw error;
    return {
      definitions: [] as PiGatewayToolDefinition[],
      runtimeCapability: {
        identity: `pi-native-unavailable:${args.mode}`,
        availableCapabilityIds: [] as string[],
      },
      materializeOrReuse: async (_input: {
        sourcePath: string;
        sourceId: string;
        revision: string;
      }): Promise<{ path: string; reused: boolean }> => {
        throw new Error("pi_path_inspection_unavailable");
      },
      commitGeneratedOutputs: async (
        _files: { stagedPath: string }[],
      ): Promise<string[]> => {
        throw new Error("pi_path_inspection_unavailable");
      },
    };
  }
  const definitions: PiGatewayToolDefinition[] = [];
  const managedDir = joinPath(args.ownerRoot, "files");
  const manifestPath = joinPath(args.ownerRoot, "managed-files.json");
  const ownerIdentity = await resolveRuntimePathIdentity({
    root,
    path: args.ownerRoot,
    allowMissing: true,
  }).catch(() => null);
  const privateKey = ownerIdentity?.canonicalKey.replace(/\\/g, "/");
  function assertPublic(key: string) {
    const normalized = key.replace(/\\/g, "/");
    if (
      privateKey &&
      (normalized === privateKey || normalized.startsWith(`${privateKey}/`))
    )
      throw new Error("pi_path_private_owner");
  }

  async function readManifest(): Promise<ManagedEntry[]> {
    if (!(await runtimePathExists(manifestPath))) return [];
    const info = await statRuntimePathStrict(manifestPath);
    if (!info.exists || info.isDir || info.size > 1024 * 1024)
      throw new Error("pi_manifest_corrupt");
    const parsed = JSON.parse(
      await readRuntimeTextFileStrict(manifestPath),
    ) as { version?: unknown; entries?: unknown };
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length > 4096 ||
      parsed.entries.some((entry) => {
        const row = entry as ManagedEntry;
        return (
          !row ||
          !["source", "generated"].includes(row.kind) ||
          typeof row.name !== "string" ||
          !/^managed-[A-Za-z0-9.-]+$/.test(row.name) ||
          !Number.isSafeInteger(row.size) ||
          row.size < 0 ||
          typeof row.sha256 !== "string" ||
          (row.kind === "source" &&
            (typeof row.sourceKey !== "string" ||
              typeof row.revisionKey !== "string"))
        );
      })
    )
      throw new Error("pi_manifest_corrupt");
    return parsed.entries as ManagedEntry[];
  }

  async function commitManifest(entries: ManagedEntry[]) {
    if (entries.length > 4096) throw new Error("pi_manifest_limit");
    const content = JSON.stringify({ version: 1, entries });
    if (textEncoder.encode(content).length > 1024 * 1024)
      throw new Error("pi_manifest_limit");
    await ensureRuntimeDirectoryStrict(args.ownerRoot);
    await replaceRuntimeTextFileAtomically(manifestPath, content);
  }

  async function nextManagedPath(sourcePath: string) {
    await ensureRuntimeDirectoryStrict(managedDir);
    const extension = (getBaseName(sourcePath).match(
      /\.[A-Za-z0-9]{1,12}$/,
    ) || [""])[0];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const name = `managed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${extension}`;
      const path = joinPath(managedDir, name);
      if (!(await runtimePathExists(path))) return { name, path };
    }
    throw new Error("pi_managed_name_unavailable");
  }

  async function materializeOrReuse(input: {
    sourcePath: string;
    sourceId: string;
    revision: string;
  }) {
    return withOwnerLock(args.ownerRoot, async () => {
      if (!input.sourceId || !input.revision)
        throw new Error("pi_source_identity_missing");
      const source = await inspectRuntimeFileSource(input.sourcePath);
      if (source.size > 256 * 1024 * 1024)
        throw new Error("pi_managed_file_too_large");
      const digest = await digestRuntimeFileSource(source);
      if (digest.bytesRead !== source.size)
        throw new Error("pi_source_changed");
      const sourceKey = await sha256PrefixedHex(
        textEncoder.encode(input.sourceId),
      );
      const revisionKey = await sha256PrefixedHex(
        textEncoder.encode(input.revision),
      );
      if (!sourceKey || !revisionKey) throw new Error("pi_digest_unavailable");
      const entries = await readManifest();
      const current = entries.find(
        (entry) =>
          entry.kind === "source" &&
          entry.sourceKey === sourceKey &&
          entry.revisionKey === revisionKey &&
          entry.size === source.size &&
          entry.sha256 === digest.sha256,
      );
      if (current) {
        const existingPath = joinPath(managedDir, current.name);
        const existing = await resolveRuntimePathIdentity({
          root: args.ownerRoot,
          path: existingPath,
        }).catch(() => null);
        if (existing?.exists) {
          const info = await statRuntimePathStrict(existing.path);
          if (!info.isDir) return { path: existing.path, reused: true };
        }
      }
      if (
        entries.reduce((sum, entry) => sum + entry.size, 0) + source.size >
        2 * 1024 * 1024 * 1024
      )
        throw new Error("pi_owner_quota_exceeded");
      const target = await nextManagedPath(input.sourcePath);
      try {
        await copyRuntimeFile({
          sourcePath: input.sourcePath,
          targetPath: target.path,
        });
        const copied = await digestRuntimeFileSource({
          path: target.path,
          size: source.size,
        });
        if (copied.bytesRead !== source.size || copied.sha256 !== digest.sha256)
          throw new Error("pi_source_changed");
        entries.push({
          kind: "source",
          sourceKey,
          revisionKey,
          size: source.size,
          sha256: digest.sha256,
          name: target.name,
        });
        await commitManifest(entries);
        return { path: target.path, reused: false };
      } catch (error) {
        await removeRuntimePath(target.path).catch(() => false);
        throw error;
      }
    });
  }

  async function commitGeneratedOutputs(files: { stagedPath: string }[]) {
    return withOwnerLock(args.ownerRoot, async () => {
      const entries = await readManifest();
      const staged = [] as { path: string; size: number; sha256: string }[];
      let newBytes = 0;
      for (const file of files) {
        const identity = await resolveRuntimePathIdentity({
          root,
          path: file.stagedPath,
        });
        const source = await inspectRuntimeFileSource(identity.path);
        if (source.size > 256 * 1024 * 1024)
          throw new Error("pi_generated_file_too_large");
        const digest = await digestRuntimeFileSource(source);
        if (digest.bytesRead !== source.size)
          throw new Error("pi_generated_file_changed");
        newBytes += source.size;
        staged.push({
          path: identity.path,
          size: source.size,
          sha256: digest.sha256,
        });
      }
      if (
        newBytes > 512 * 1024 * 1024 ||
        entries.reduce((sum, entry) => sum + entry.size, 0) + newBytes >
          2 * 1024 * 1024 * 1024
      )
        throw new Error("pi_owner_quota_exceeded");
      const promoted: string[] = [];
      const temporary: string[] = [];
      try {
        for (const file of staged) {
          const target = await nextManagedPath(file.path);
          const tempPath = `${target.path}.staging`;
          temporary.push(tempPath);
          await copyRuntimeFile({
            sourcePath: file.path,
            targetPath: tempPath,
          });
          const copied = await digestRuntimeFileSource({
            path: tempPath,
            size: file.size,
          });
          if (copied.bytesRead !== file.size || copied.sha256 !== file.sha256)
            throw new Error("pi_generated_file_changed");
          await moveRuntimePath({
            sourcePath: tempPath,
            targetPath: target.path,
          });
          promoted.push(target.path);
          entries.push({
            kind: "generated",
            size: file.size,
            sha256: file.sha256,
            name: target.name,
          });
        }
        await commitManifest(entries);
        return promoted;
      } catch (error) {
        await Promise.all(
          [...promoted, ...temporary].map((path) =>
            removeRuntimePath(path).catch(() => false),
          ),
        );
        throw error;
      }
    });
  }

  const fileTool = (
    name: "read" | "edit" | "write",
    schema: Record<string, unknown>,
    effect: "bounded-read" | "workspace-mutation",
    executeFile: (input: FileArgs, path: string) => Promise<PiGatewayExecution>,
  ): PiGatewayToolDefinition => ({
    capabilityId: `pi.native.${name}`,
    name,
    description: `${name} a workspace file`,
    schema,
    minimumEffects: [effect],
    maxResultBytes: name === "read" ? 1024 * 1024 : 256 * 1024,
    classify: async (value): Promise<PiGatewayClassification> => {
      const input = value as FileArgs;
      const identity = await resolveRuntimePathIdentity({
        root,
        path: input.path,
        allowMissing: name === "write",
      });
      assertPublic(identity.canonicalKey);
      return {
        effects: [effect],
        authorizationKeys: [`workspace:${root}`],
        resourceKeys: [`file:${identity.canonicalKey}`],
        cost: 1,
      };
    },
    execute: async (value, context) => {
      if (context.signal.aborted)
        return { status: "canceled", effectCertainty: "not_started" };
      let identity: { path: string; exists: boolean; canonicalKey: string };
      try {
        const input = value as FileArgs;
        identity = await resolveRuntimePathIdentity({
          root,
          path: input.path,
          allowMissing: name === "write",
        });
        assertPublic(identity.canonicalKey);
      } catch (error) {
        return failure(
          String(error).includes("pi_path_")
            ? "pi_path_invalid"
            : "pi_file_failed",
        );
      }
      try {
        return await executeFile(value as FileArgs, identity.path);
      } catch {
        return effect === "workspace-mutation"
          ? {
              status: "failed",
              effectCertainty: "unknown",
              code: "pi_file_state_unknown",
            }
          : failure("pi_file_failed");
      }
    },
  });

  definitions.push(
    fileTool(
      "read",
      {
        type: "object",
        properties: {
          path: pathSchema,
          offset: boundedLimit(Number.MAX_SAFE_INTEGER),
          limit: boundedLimit(VISIBLE_LINES),
        },
        required: ["path"],
        additionalProperties: false,
      },
      "bounded-read",
      async (input, path) => {
        const stat = await statRuntimePathStrict(path);
        if (!stat.exists || stat.isDir) return failure("pi_file_not_regular");
        if (stat.size > 50 * 1024 * 1024) return failure("pi_file_too_large");
        if (/\.(?:png|jpe?g|gif|webp|bmp)$/i.test(path)) {
          if (stat.size > 700 * 1024 || typeof btoa !== "function")
            return failure("pi_image_too_large");
          const bytes = await readRuntimeBytes(path);
          let binary = "";
          for (let offset = 0; offset < bytes.length; offset += 0x8000)
            binary += String.fromCharCode(
              ...bytes.subarray(offset, offset + 0x8000),
            );
          const extension = getBaseName(path).split(".").pop()?.toLowerCase();
          return result({
            kind: "image",
            mimeType: `image/${extension === "jpg" ? "jpeg" : extension}`,
            base64: btoa(binary),
          });
        }
        let lineNo = 0;
        const selected: string[] = [];
        let bytes = 0;
        let truncated = false;
        const stop = {};
        try {
          await scanRuntimeUtf8Lines({
            path,
            onLine: (line) => {
              lineNo += 1;
              if (lineNo < (input.offset || 1)) return;
              if (
                selected.length >= (input.limit || VISIBLE_LINES) ||
                selected.length >= VISIBLE_LINES ||
                bytes + line.length > VISIBLE_BYTES
              ) {
                truncated = true;
                throw stop;
              }
              if (looksBinaryText(line.text)) throw new Error("pi_binary_file");
              selected.push(line.text.replace(/\n$/, ""));
              bytes += line.length;
            },
          });
        } catch (error) {
          if (error !== stop) throw error;
        }
        return result({
          text: selected.join("\n"),
          truncated,
          nextOffset: truncated ? (input.offset || 1) + selected.length : null,
        });
      },
    ),
  );

  definitions.push(
    fileTool(
      "write",
      {
        type: "object",
        properties: { path: pathSchema, content: { type: "string" } },
        required: ["path", "content"],
        additionalProperties: false,
      },
      "workspace-mutation",
      async (input, path) => {
        await replaceRuntimeTextFileAtomically(path, input.content || "");
        return result({ written: true });
      },
    ),
  );

  definitions.push(
    fileTool(
      "edit",
      {
        type: "object",
        properties: {
          path: pathSchema,
          edits: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                oldText: { type: "string", minLength: 1 },
                newText: { type: "string" },
              },
              required: ["oldText", "newText"],
              additionalProperties: false,
            },
          },
        },
        required: ["path", "edits"],
        additionalProperties: false,
      },
      "workspace-mutation",
      async (input, path) => {
        const stat = await statRuntimePathStrict(path);
        if (!stat.exists || stat.isDir || stat.size > MAX_EDIT_BYTES)
          return failure("pi_file_not_editable");
        const original = await readRuntimeTextFileStrict(path);
        const positions = (input.edits || []).map((edit) => ({
          ...edit,
          at: original.indexOf(edit.oldText),
        }));
        if (
          positions.some(
            (edit) =>
              edit.at < 0 || original.indexOf(edit.oldText, edit.at + 1) >= 0,
          )
        )
          return failure("pi_edit_ambiguous");
        positions.sort((a, b) => a.at - b.at);
        if (
          positions.some(
            (edit, index) =>
              index > 0 &&
              positions[index - 1].at + positions[index - 1].oldText.length >
                edit.at,
          )
        )
          return failure("pi_edit_overlap");
        let changed = original;
        for (const edit of positions.reverse())
          changed =
            changed.slice(0, edit.at) +
            edit.newText +
            changed.slice(edit.at + edit.oldText.length);
        await replaceRuntimeTextFileAtomically(path, changed);
        return result({ edits: positions.length });
      },
    ),
  );

  if (args.mode === "restricted") {
    const searchSchema = (name: "grep" | "find" | "ls") => ({
      type: "object",
      properties: {
        path: pathSchema,
        ...(name === "ls" ? {} : { pattern: pathSchema }),
        ...(name === "grep"
          ? {
              glob: pathSchema,
              ignoreCase: { type: "boolean" },
              literal: { type: "boolean" },
              context: { type: "integer", minimum: 0, maximum: 10 },
            }
          : {}),
        limit: boundedLimit(
          name === "grep" ? 100 : name === "find" ? 1000 : 500,
        ),
      },
      required: name === "ls" ? [] : ["pattern"],
      additionalProperties: false,
    });
    async function walk(
      start: string,
      onEntry: (
        path: string,
        relative: string,
        isDir: boolean,
      ) => Promise<boolean>,
      maxDepth = Infinity,
    ) {
      const stack: {
        path: string;
        relative: string;
        depth: number;
        rules: { base: string; matcher: ReturnType<typeof ignore> }[];
      }[] = [{ path: start, relative: "", depth: 0, rules: [] }];
      let visited = 0;
      while (stack.length) {
        const item = stack.pop()!;
        const rules = [...item.rules];
        const ignorePath = joinPath(item.path, ".gitignore");
        const ignoreInfo = await statRuntimePathStrict(ignorePath).catch(
          () => ({ exists: false, size: 0, isDir: false }),
        );
        if (
          ignoreInfo.exists &&
          !ignoreInfo.isDir &&
          ignoreInfo.size <= 256 * 1024
        ) {
          const matcher = ignore().add(
            await readRuntimeTextFileStrict(ignorePath),
          );
          rules.push({ base: item.relative, matcher });
        }
        const children = (await listRuntimeChildrenStrict(item.path)).sort();
        for (const child of children) {
          const name = getBaseName(child);
          if (name === ".git" || child === args.ownerRoot) continue;
          const relative = item.relative ? `${item.relative}/${name}` : name;
          try {
            const childIdentity = await resolveRuntimePathIdentity({
              root,
              path: child,
            });
            assertPublic(childIdentity.canonicalKey);
          } catch {
            continue;
          }
          const stat = await statRuntimePathStrict(child);
          if (!stat.exists) continue;
          if (
            rules.some(({ base, matcher }) => {
              const sub = base ? relative.slice(base.length + 1) : relative;
              return matcher.ignores(stat.isDir ? `${sub}/` : sub);
            })
          )
            continue;
          visited += 1;
          if (visited > 50000) return true;
          if (await onEntry(child, relative, stat.isDir)) return true;
          if (stat.isDir && item.depth + 1 < maxDepth)
            stack.push({ path: child, relative, depth: item.depth + 1, rules });
        }
      }
      return false;
    }
    for (const name of ["grep", "find", "ls"] as const) {
      definitions.push({
        capabilityId: `pi.broker.${name}`,
        name,
        description: `${name} in the workspace without a subprocess`,
        schema: searchSchema(name),
        minimumEffects: ["bounded-read"],
        maxResultBytes: 256 * 1024,
        classify: async (value) => {
          const input = value as SearchArgs;
          if (name === "grep")
            safeSearchExpression(
              input.pattern || "",
              !!input.literal,
              !!input.ignoreCase,
            );
          if (name === "find" && (input.pattern || "").length > 256)
            throw new Error("pi_pattern_unsupported");
          const identity = await resolveRuntimePathIdentity({
            root,
            path: input.path || root,
          });
          assertPublic(identity.canonicalKey);
          return {
            effects: ["bounded-read"],
            authorizationKeys: [`workspace:${root}`],
            resourceKeys: [`dir:${identity.canonicalKey}`],
            cost: 1,
          };
        },
        execute: async (value, context) => {
          if (context.signal.aborted)
            return { status: "canceled", effectCertainty: "not_started" };
          try {
            const input = value as SearchArgs;
            const startIdentity = await resolveRuntimePathIdentity({
              root,
              path: input.path || root,
            });
            assertPublic(startIdentity.canonicalKey);
            const start = startIdentity.path;
            const stat = await statRuntimePathStrict(start);
            if (!stat.isDir) return failure("pi_search_not_directory");
            const limit = Math.min(
              input.limit ||
                (name === "grep" ? 100 : name === "find" ? 1000 : 500),
              name === "grep" ? 100 : name === "find" ? 1000 : 500,
            );
            const entries: string[] = [];
            const matches: {
              path: string;
              line: number;
              text: string;
              before?: string[];
              after?: string[];
            }[] = [];
            let visibleBytes = 0;
            let outputFull = false;
            let truncated = false;
            const pattern = name === "find" ? input.pattern || "" : null;
            const filter = input.glob || null;
            const expression =
              name === "grep"
                ? safeSearchExpression(
                    input.pattern || "",
                    !!input.literal,
                    !!input.ignoreCase,
                  )
                : null;
            const exhausted = await walk(
              start,
              async (path, relative, isDir) => {
                if (context.signal.aborted)
                  throw new Error("pi_search_canceled");
                if (name === "ls" && relative.includes("/")) return false;
                if (
                  name === "ls" ||
                  (name === "find" &&
                    (matchesGlob(pattern!, relative) ||
                      matchesGlob(pattern!, getBaseName(path))))
                ) {
                  const entry = isDir ? `${relative}/` : relative;
                  const entryBytes = textEncoder.encode(entry).length;
                  if (visibleBytes + entryBytes > VISIBLE_BYTES) {
                    outputFull = true;
                    return true;
                  }
                  visibleBytes += entryBytes;
                  entries.push(entry);
                  return entries.length >= limit;
                }
                if (
                  name === "grep" &&
                  !isDir &&
                  (!filter ||
                    matchesGlob(filter, relative) ||
                    matchesGlob(filter, getBaseName(path)))
                ) {
                  const info = await statRuntimePathStrict(path);
                  if (info.size > 10 * 1024 * 1024) return false;
                  const stop = {};
                  let lineNo = 0;
                  const contextLines = input.context || 0;
                  const previous: string[] = [];
                  const pending: {
                    until: number;
                    match: (typeof matches)[number];
                  }[] = [];
                  try {
                    await scanRuntimeUtf8Lines({
                      path,
                      onLine: (line) => {
                        lineNo += 1;
                        const shown = visibleText(
                          line.text.replace(/\n$/, ""),
                        ).text.slice(0, 500);
                        for (const item of pending) {
                          if (lineNo <= item.until) {
                            const nextBytes = textEncoder.encode(shown).length;
                            if (visibleBytes + nextBytes > VISIBLE_BYTES) {
                              outputFull = true;
                              throw stop;
                            }
                            visibleBytes += nextBytes;
                            item.match.after!.push(shown);
                          }
                        }
                        while (pending.length && pending[0].until <= lineNo)
                          pending.shift();
                        if (matches.length >= limit && pending.length === 0)
                          throw stop;
                        if (matches.length >= limit) return;
                        if (!expression!.test(line.text)) {
                          if (contextLines) {
                            previous.push(shown);
                            if (previous.length > contextLines)
                              previous.shift();
                          }
                          return;
                        }
                        const before = contextLines ? [...previous] : undefined;
                        const nextBytes =
                          textEncoder.encode(
                            relative + shown + (before || []).join(""),
                          ).length + 32;
                        if (visibleBytes + nextBytes > VISIBLE_BYTES) {
                          outputFull = true;
                          throw stop;
                        }
                        visibleBytes += nextBytes;
                        const match = {
                          path: relative,
                          line: lineNo,
                          text: shown,
                          ...(contextLines
                            ? { before, after: [] as string[] }
                            : {}),
                        };
                        matches.push(match);
                        if (contextLines)
                          pending.push({ until: lineNo + contextLines, match });
                        if (contextLines) {
                          previous.push(shown);
                          if (previous.length > contextLines) previous.shift();
                        }
                        if (matches.length >= limit && !contextLines)
                          throw stop;
                      },
                    });
                  } catch (error) {
                    if (error !== stop) throw error;
                  }
                  return outputFull || matches.length >= limit;
                }
                return false;
              },
              name === "ls" ? 1 : Infinity,
            );
            truncated = exhausted || outputFull;
            if (name === "grep") return result({ matches, truncated });
            return result(
              name === "ls"
                ? { entries: entries.sort(), truncated }
                : { paths: entries.sort(), truncated },
            );
          } catch (error) {
            return failure(
              String(error).includes("canceled")
                ? "pi_search_canceled"
                : "pi_search_failed",
            );
          }
        },
      });
    }
  }

  if (args.mode === "trusted") {
    const subprocess = getMozillaSubprocessModule();
    const windows = detectRuntimePlatform() === "win32";
    const shellNames = windows ? ["pwsh", "powershell"] : ["bash"];
    const snapshot = getRuntimeEnvironmentSnapshot();
    const servicesEnv = (
      globalThis as { Services?: { env?: { get?: (key: string) => string } } }
    ).Services?.env;
    const systemRoot = windows
      ? snapshot.env.SystemRoot ||
        snapshot.env.SYSTEMROOT ||
        snapshot.env.WINDIR ||
        servicesEnv?.get?.("SystemRoot") ||
        ""
      : "";
    let shellPath = "";
    for (const name of shellNames) {
      const resolution = await resolveRuntimeCommand(name).catch(() => null);
      if (
        resolution?.available &&
        resolution.resolvedPath &&
        (!windows || /\.exe$/i.test(resolution.resolvedPath)) &&
        !resolution.resolvedPath
          .replace(/\\/g, "/")
          .toLowerCase()
          .startsWith(`${root.replace(/\\/g, "/").toLowerCase()}/`)
      ) {
        shellPath = resolution.resolvedPath;
        break;
      }
    }
    if (
      subprocess?.call &&
      shellPath &&
      (!windows || /^[A-Za-z]:[\\/]/.test(systemRoot))
    ) {
      const name = windows ? "powershell" : "bash";
      definitions.push({
        capabilityId: `pi.native.${name}`,
        name,
        description: "Run a native command in the workspace",
        schema: {
          type: "object",
          properties: {
            command: { type: "string", minLength: 1 },
            timeout: { type: "integer", minimum: 1, maximum: 3600 },
          },
          required: ["command"],
          additionalProperties: false,
        },
        minimumEffects: ["code-execution"],
        maxResultBytes: 256 * 1024,
        batchMode: "exclusive",
        classify: (value) => {
          const command = (value as { command: string }).command.trim();
          const literal = /^(?:pwd|true|false)$/.test(command);
          return {
            effects: literal
              ? ["code-execution", "bounded-read"]
              : [
                  "code-execution",
                  "workspace-mutation",
                  "external-egress",
                  "local-network",
                  "host-control",
                ],
            authorizationKeys: [
              `workspace:${root}`,
              literal ? "execution:literal" : "execution:opaque",
            ],
            resourceKeys: [`workspace:${root}`],
            cost: 2,
            safeRefs: [literal ? "literal-execution" : "opaque-execution"],
          };
        },
        execute: async (value, context) => {
          if (context.signal.aborted)
            return { status: "canceled", effectCertainty: "not_started" };
          const input = value as { command: string; timeout?: number };
          const scratch = joinPath(args.ownerRoot, "scratch");
          await ensureRuntimeDirectoryStrict(args.ownerRoot);
          await ensureRuntimeDirectoryStrict(scratch);
          if (!windows) {
            const ownerPrivate = await setRuntimeFilePermissions(
              args.ownerRoot,
              0o700,
            );
            const scratchPrivate = await setRuntimeFilePermissions(
              scratch,
              0o700,
            );
            if (!ownerPrivate || !scratchPrivate)
              return failure("pi_shell_private_storage_unavailable");
          }
          const outputPath = joinPath(
            scratch,
            `shell-${Date.now()}-${Math.random().toString(36).slice(2)}.log`,
          );
          await writeRuntimeBytes(outputPath, new Uint8Array());
          if (!windows && !(await setRuntimeFilePermissions(outputPath, 0o600)))
            return failure("pi_shell_private_storage_unavailable");
          const environment: Record<string, string> = windows
            ? {
                SystemRoot: systemRoot,
                WINDIR: systemRoot,
                PATH: `${joinPath(systemRoot, "System32")};${systemRoot}`,
                HOME: args.ownerRoot,
                USERPROFILE: args.ownerRoot,
                TEMP: scratch,
                TMP: scratch,
              }
            : {
                PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
                HOME: args.ownerRoot,
                TMPDIR: scratch,
                LANG: "C.UTF-8",
              };
          let process: Awaited<ReturnType<NonNullable<typeof subprocess.call>>>;
          try {
            process = await subprocess.call!({
              command: shellPath,
              arguments: windows
                ? [
                    "-NoLogo",
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    input.command,
                  ]
                : ["--noprofile", "--norc", "-c", input.command],
              environment,
              environmentAppend: false,
              workdir: root,
              stderr: "pipe",
            });
          } catch {
            return {
              status: "failed",
              effectCertainty: "unknown",
              code: "pi_shell_start_unknown",
            };
          }
          let bytes = 0;
          let tail = "";
          let overflow = false;
          async function drain(pipe: typeof process.stdout) {
            while (pipe?.readString) {
              const chunk = await pipe.readString();
              if (!chunk) break;
              bytes += textEncoder.encode(chunk).length;
              if (bytes > 50 * 1024 * 1024) {
                overflow = true;
                process.kill?.();
                break;
              }
              await appendRuntimeTextFile(outputPath, chunk);
              tail = `${tail}${chunk}`;
              if (tail.length > 2 * VISIBLE_BYTES)
                tail = tail.slice(-2 * VISIBLE_BYTES);
            }
          }
          const drains = Promise.allSettled([
            drain(process.stdout),
            drain(process.stderr),
          ]);
          let timedOut = false;
          let canceled = false;
          let stopTimer: ReturnType<typeof setTimeout> | undefined;
          let resolveUnproved!: () => void;
          const unproved = new Promise<"unproved">((resolve) => {
            resolveUnproved = () => resolve("unproved");
          });
          const requestStop = () => {
            try {
              process.kill?.();
            } catch {
              /* termination is unproved */
            }
            stopTimer ||= setTimeout(resolveUnproved, 3000);
          };
          const timeoutMs = Math.min(input.timeout || 900, 3600) * 1000;
          const timer = setTimeout(() => {
            timedOut = true;
            requestStop();
          }, timeoutMs);
          const onAbort = () => {
            canceled = true;
            requestStop();
          };
          context.signal.addEventListener("abort", onAbort, { once: true });
          let exit: unknown;
          try {
            const settled = await Promise.race([
              (async () => {
                const value = await process.wait?.();
                const results = await drains;
                if (results.some((item) => item.status === "rejected"))
                  throw new Error("pi_shell_output_failed");
                return { kind: "settled" as const, value };
              })(),
              unproved.then(() => ({ kind: "unproved" as const, value: null })),
            ]);
            if (settled.kind === "unproved")
              return {
                status: "failed",
                effectCertainty: "unknown",
                code: "pi_shell_state_unknown",
              };
            exit = settled.value;
          } catch {
            return {
              status: "failed",
              effectCertainty: "unknown",
              code: "pi_shell_state_unknown",
            };
          } finally {
            clearTimeout(timer);
            if (stopTimer) clearTimeout(stopTimer);
            context.signal.removeEventListener("abort", onAbort);
          }
          if (overflow || timedOut || canceled)
            return {
              status: "failed",
              effectCertainty: "unknown",
              code: overflow
                ? "pi_shell_output_limit"
                : timedOut
                  ? "pi_shell_timeout"
                  : "pi_shell_canceled",
            };
          const code =
            normalizeSubprocessExitCode(exit) ??
            normalizeSubprocessExitCode(process.exitCode);
          const visible = visibleTail(tail);
          return {
            status: code === 0 ? "completed" : "failed",
            effectCertainty: "confirmed_complete",
            code: code === 0 ? undefined : "pi_shell_exit_nonzero",
            value: {
              text: visible.text,
              truncated:
                visible.truncated || bytes > textEncoder.encode(tail).length,
              outputPath,
              exitCode: code,
            },
          };
        },
      });
    }
  }

  const order =
    args.mode === "trusted"
      ? ["read", "bash", "powershell", "edit", "write"]
      : ["read", "edit", "write", "grep", "find", "ls"];
  definitions.sort(
    (left, right) => order.indexOf(left.name) - order.indexOf(right.name),
  );
  return {
    definitions,
    materializeOrReuse,
    commitGeneratedOutputs,
    runtimeCapability: {
      identity: `pi-native:${args.mode}:${root}`,
      availableCapabilityIds: definitions.map((item) => item.capabilityId),
    },
  };
}
