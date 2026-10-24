import { config } from "../../../package.json";
import { resolveRuntimeZotero } from "../../utils/runtimeBridge";
import { joinPath } from "../../utils/path";
import {
  createCancellationController,
  type CancellationSignal,
} from "../../utils/wait";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeTextRange,
  removeRuntimePath,
  statRuntimePath,
} from "../runtimePersistence";
import { readRuntimeFileRangesWithWorker } from "../runtimeFileRangeReader";
import {
  registerHostBridgeFileHandle,
  releaseHostBridgeAcquisitionFiles,
} from "../runtimeFileRegistry";
import {
  AcquisitionError,
  acquisitionRef,
} from "./zoteroHostAcquisitionAuthority";
import { shutdownAcquisitionGrants } from "./zoteroHostAcquisitionAuthority";
import {
  ACQUISITION_LIMITS as limits,
  type AcquisitionProfile,
} from "./zoteroHostAcquisitionTypes";
import type {
  AcquisitionDependencies,
  NativeAcquisitionObservation,
  NativeAcquisitionPage,
} from "./zoteroHostAcquisition";

const PROFILE_PREFIX = "Zotero Agents Full Text ";
const ACTOR = "ZoteroAgentsAcquisitionPage";
let actorRegistered = false;

export async function shutdownNativeAcquisition() {
  await shutdownAcquisitionGrants();
  if (actorRegistered) {
    runtime().ChromeUtils.unregisterWindowActor(ACTOR);
    actorRegistered = false;
  }
}

function runtime() {
  const g = globalThis as any;
  if (!g.ChromeUtils?.importESModule || !g.Services || !resolveRuntimeZotero())
    throw new AcquisitionError("unavailable", "runtime_unavailable");
  return g;
}
function identities() {
  return runtime().ChromeUtils.importESModule(
    "resource://gre/modules/ContextualIdentityService.sys.mjs",
  ).ContextualIdentityService;
}
function identity(ref: string) {
  const value = identities()
    .getPublicIdentities()
    .find((i: any) => i.name === PROFILE_PREFIX + ref);
  if (!value)
    throw new AcquisitionError("invalid_request", "profile_not_found");
  return value;
}
export function listNativeAcquisitionProfiles(): AcquisitionProfile[] {
  return identities()
    .getPublicIdentities()
    .filter(
      (i: any) =>
        typeof i.name === "string" && i.name.startsWith(PROFILE_PREFIX),
    )
    .slice(0, limits.profiles)
    .map((i: any, index: number) => ({
      authProfileRef: i.name.slice(PROFILE_PREFIX.length),
      name: `Institution ${index + 1}`,
    }));
}
function registerActor() {
  if (actorRegistered) return;
  runtime().ChromeUtils.registerWindowActor(ACTOR, {
    allFrames: false,
    matches: ["http://*/*", "https://*/*"],
    child: {
      esModuleURI: `chrome://${config.addonRef}/content/acquisition/AcquisitionPageChild.sys.mjs`,
    },
  });
  actorRegistered = true;
}

async function closeWindow(win: any) {
  if (win.closed) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AcquisitionError("unavailable", "page_close_timeout")),
      3000,
    );
    win.addEventListener(
      "unload",
      () => {
        clearTimeout(timer);
        setTimeout(resolve, 0);
      },
      { once: true },
    );
    win.close();
  });
}

async function validatePdf(
  path: string,
  title: string,
  signal: CancellationSignal,
) {
  runtime();
  const zotero = resolveRuntimeZotero()!;
  const stat = await statRuntimePath(path);
  if (!stat.exists || stat.size < 5 || stat.size > limits.downloadBytes)
    throw new AcquisitionError("unavailable", "resource_limit");
  if ((await readRuntimeTextRange(path, 0, 5)) !== "%PDF-")
    throw new AcquisitionError("unavailable", "non_pdf");
  const bytes = new Uint8Array(stat.size);
  for (let offset = 0; offset < stat.size; offset += 1024 * 1024) {
    if (signal.aborted) throw new AcquisitionError("unavailable", "canceled");
    const length = Math.min(1024 * 1024, stat.size - offset);
    const [chunk] = await readRuntimeFileRangesWithWorker(path, [
      { offset, length },
    ]);
    if (chunk.byteLength !== length)
      throw new AcquisitionError("unavailable", "unreadable_pdf");
    bytes.set(chunk, offset);
  }
  const win = zotero.getMainWindow();
  const worker = new win.Worker(
    `chrome://${config.addonRef}/content/acquisition/PdfValidationWorker.js`,
  );
  let settled = false;
  let rejectValidation: (error: Error) => void = () => {};
  const abort = () =>
    rejectValidation(new AcquisitionError("unavailable", "canceled"));
  const timer = setTimeout(
    () =>
      rejectValidation(new AcquisitionError("unavailable", "resource_limit")),
    limits.validationMs,
  );
  try {
    const result = await new Promise<{ text: string; totalPages: number }>(
      (resolve, reject) => {
        rejectValidation = reject;
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) {
          abort();
          return;
        }
        worker.onerror = () =>
          reject(new AcquisitionError("unavailable", "unreadable_pdf"));
        worker.onmessage = async (event: any) => {
          if (settled) return;
          const message = event.data;
          if (message.responseID === 1) {
            if (message.error)
              reject(new AcquisitionError("unavailable", "unreadable_pdf"));
            else resolve(message.data);
            return;
          }
          if (!message.id) return;
          let data: Uint8Array | null = null;
          try {
            if (
              message.action === "FetchData" &&
              typeof message.data === "string" &&
              /^(?:cmaps|standard_fonts)\/[A-Za-z0-9_.-]+$/.test(message.data)
            ) {
              const response = await zotero.HTTP.request(
                "GET",
                `resource://zotero/reader/pdf/web/${message.data}`,
                { responseType: "arraybuffer" },
              );
              data = new Uint8Array(response.response);
            }
            if (!settled)
              worker.postMessage(
                { responseID: message.id, data },
                data ? [data.buffer] : [],
              );
          } catch {
            if (!settled)
              reject(new AcquisitionError("unavailable", "unreadable_pdf"));
          }
        };
        worker.postMessage(
          {
            id: 1,
            action: "pdf.getFulltext",
            data: { buf: bytes.buffer, maxPages: 2 },
          },
          [bytes.buffer],
        );
      },
    );
    const normalize = (value: string) =>
      value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
    if (
      !Number.isSafeInteger(result.totalPages) ||
      result.totalPages < 1 ||
      typeof result.text !== "string"
    )
      throw new AcquisitionError("unavailable", "unreadable_pdf");
    if (
      !normalize(title) ||
      !normalize(result.text.slice(0, 128000)).includes(normalize(title))
    )
      throw new AcquisitionError("unavailable", "identity_mismatch");
    return { size: stat.size, pages: result.totalPages };
  } catch (error) {
    if (error instanceof AcquisitionError) throw error;
    throw new AcquisitionError(
      "unavailable",
      signal.aborted ? "canceled" : "unreadable_pdf",
    );
  } finally {
    settled = true;
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    worker.terminate();
  }
}

export function createNativeAcquisitionDependencies(
  resolveParent: AcquisitionDependencies["resolveParent"],
): AcquisitionDependencies {
  return {
    resolveParent,
    async clearProfile(profileRef) {
      const context = identity(profileRef).userContextId;
      await new Promise<void>((resolve, reject) => {
        runtime().Services.clearData.deleteDataFromOriginAttributesPattern(
          { userContextId: context },
          {
            onDataDeleted: (failed: number) =>
              failed
                ? reject(
                    new AcquisitionError("unavailable", "profile_clear_failed"),
                  )
                : resolve(),
          },
        );
      });
    },
    async profiles() {
      if (!listNativeAcquisitionProfiles().length)
        identities().create(
          PROFILE_PREFIX + acquisitionRef(),
          "fingerprint",
          "blue",
        );
      return listNativeAcquisitionProfiles();
    },
    async open(profileRef, url) {
      const g = runtime();
      registerActor();
      const context = identity(profileRef).userContextId;
      // A unique viewer is required even when concurrent tasks share the same URL and authentication.
      const arg = { uri: url, options: { userContextId: context } } as any;
      arg.wrappedJSObject = arg;
      const win = g.Services.ww.openWindow(
        null,
        "chrome://zotero/content/standalone/basicViewer.xhtml",
        null,
        "chrome,dialog=yes,resizable,centerscreen,menubar,scrollbars",
        arg,
      );
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(new AcquisitionError("unavailable", "runtime_unavailable")),
          5000,
        );
        win.addEventListener(
          "load",
          () => {
            clearTimeout(timer);
            setTimeout(resolve, 0);
          },
          { once: true },
        );
      }).catch(async (error) => {
        await closeWindow(win);
        throw error;
      });
      const browser = win.document.querySelector("browser");
      let signature = "";
      let revision = acquisitionRef();
      const page: NativeAcquisitionPage = {
        onClose(listener) {
          win.addEventListener("unload", listener, { once: true });
          return () => win.removeEventListener("unload", listener);
        },
        async observe() {
          if (win.closed)
            return {
              documentId: "closed",
              closed: true,
              loading: false,
              authentication: false,
              origin: "",
              title: "",
              text: "",
              targets: [],
            };
          if (
            !browser.browsingContext.currentWindowGlobal ||
            browser.currentURI.spec === "about:blank"
          )
            return {
              documentId: "loading",
              closed: false,
              loading: true,
              authentication: false,
              origin: "",
              title: "",
              text: "",
              targets: [],
            };
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            const observed = (await Promise.race([
              browser.browsingContext.currentWindowGlobal
                .getActor(ACTOR)
                .sendQuery("observe", limits),
              new Promise((_, reject) => {
                timer = setTimeout(
                  () =>
                    reject(
                      new AcquisitionError(
                        "unavailable",
                        "page_observation_timeout",
                      ),
                    ),
                  3000,
                );
              }),
            ])) as NativeAcquisitionObservation;
            const next = JSON.stringify(observed);
            if (signature !== next) {
              signature = next;
              revision = acquisitionRef();
            }
            return { ...observed, documentId: revision };
          } finally {
            if (timer) clearTimeout(timer);
          }
        },
        async navigate(target) {
          if (win.closed)
            throw new AcquisitionError("unavailable", "window_closed");
          browser.loadURI(g.Services.io.newURI(target), {
            triggeringPrincipal:
              g.Services.scriptSecurityManager.getSystemPrincipal(),
          });
          win.focus();
        },
        close: () => closeWindow(win),
        async download(target, title, signal) {
          const { Downloads } = g.ChromeUtils.importESModule(
            "resource://gre/modules/Downloads.sys.mjs",
          );
          const directory = joinPath(
            getRuntimePersistencePaths().tmpDir,
            "authorized-fulltext",
          );
          await ensureRuntimeDirectory(directory);
          const path = joinPath(directory, `${acquisitionRef()}.pdf`);
          const referrerInfo = g.Cc[
            "@mozilla.org/referrer-info;1"
          ].createInstance(g.Ci.nsIReferrerInfo);
          referrerInfo.init(
            g.Ci.nsIReferrerInfo.EMPTY,
            true,
            browser.currentURI,
          );
          const download = await Downloads.createDownload({
            source: { url: target, userContextId: context, referrerInfo },
            target: path,
          });
          let limitExceeded = false;
          const validation = createCancellationController();
          const cancel = () => {
            validation.abort();
            void download.cancel().catch(() => {});
          };
          const timer = setTimeout(() => {
            limitExceeded = true;
            cancel();
          }, limits.downloadMs);
          signal.addEventListener("abort", cancel, { once: true });
          download.onchange = () => {
            if (
              download.currentBytes > limits.downloadBytes ||
              download.totalBytes > limits.downloadBytes
            ) {
              limitExceeded = true;
              cancel();
            }
          };
          try {
            if (signal.aborted)
              throw new AcquisitionError("unavailable", "canceled");
            await download.start();
            if (
              download.contentType !== "application/pdf" &&
              download.contentType !== "application/octet-stream"
            )
              throw new AcquisitionError("unavailable", "non_pdf");
            const pdf = await validatePdf(path, title, validation.signal);
            return {
              path,
              contentType: "application/pdf",
              ...pdf,
              readable: true,
              title: title.slice(0, limits.titleChars),
              identityMatched: true,
              dispose: () => removeRuntimePath(path).then(() => {}),
            };
          } catch (error) {
            await download.finalize(true).catch(() => {});
            await removeRuntimePath(path).catch(() => {});
            if (limitExceeded)
              throw new AcquisitionError("unavailable", "resource_limit");
            if (error instanceof AcquisitionError) throw error;
            throw new AcquisitionError(
              "unavailable",
              limitExceeded
                ? "resource_limit"
                : signal.aborted
                  ? "canceled"
                  : "network_failure",
            );
          } finally {
            clearTimeout(timer);
            signal.removeEventListener("abort", cancel);
          }
        },
      };
      return page;
    },
    async publishFile(file, owner, session, parentRef) {
      const descriptor = await registerHostBridgeFileHandle({
        localPath: file.path,
        sourceKind: "authorized-acquisition",
        displayName: "fulltext.pdf",
        contentType: file.contentType,
        size: file.size,
        owner: {
          acquisitionOwner: owner,
          acquisitionSession: session,
          libraryId: parentRef.libraryId,
          itemKey: parentRef.key,
        },
      });
      return descriptor.fileId;
    },
    releaseFiles: releaseHostBridgeAcquisitionFiles,
  };
}
