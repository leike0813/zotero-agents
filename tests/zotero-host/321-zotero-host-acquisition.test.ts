import { assert } from "chai";
import { createZoteroHostAcquisition } from "../../src/modules/zoteroHost/zoteroHostAcquisition";
import { listNativeAcquisitionProfiles } from "../../src/modules/zoteroHost/zoteroHostAcquisitionNative";
import {
  issueAcquisitionGrant,
  revokeAcquisitionGrant,
  bindAcquisitionParent,
} from "../../src/modules/zoteroHost/zoteroHostAcquisitionAuthority";

function confirmedGrant(input: Parameters<typeof issueAcquisitionGrant>[0]) {
  const grantId = issueAcquisitionGrant(input);
  for (const key of ["ITEM0001", "ITEM0002"])
    bindAcquisitionParent(
      { grantId, kind: input.kind, ownerId: input.ownerId },
      { libraryId: 1, key },
      { title: "Paper", url: "https://example.org/paper" },
    );
  return grantId;
}

describe("Zotero native acquisition owner", function () {
  let cloneDescriptor: PropertyDescriptor | undefined;
  beforeEach(function () {
    cloneDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "structuredClone",
    );
    Reflect.deleteProperty(globalThis, "structuredClone");
  });
  afterEach(function () {
    if (cloneDescriptor)
      Object.defineProperty(globalThis, "structuredClone", cloneDescriptor);
  });

  it("lists managed profiles alongside unnamed platform identities", function () {
    const g = globalThis as any;
    const previous = g.ChromeUtils;
    const services = g.Services;
    g.Services = services || {};
    g.ChromeUtils = {
      importESModule: () => ({
        ContextualIdentityService: {
          getPublicIdentities: () => [
            { userContextId: 1, l10nId: "user-context-personal" },
            { userContextId: 2, name: "Other context" },
            { userContextId: 3, name: "Zotero Agents Full Text managed-id" },
          ],
        },
      }),
    };
    try {
      assert.deepEqual(listNativeAcquisitionProfiles(), [
        { authProfileRef: "managed-id", name: "Institution 1" },
      ]);
    } finally {
      g.ChromeUtils = previous;
      g.Services = services;
    }
  });
  it("releases promptly but drains canceled transfers before clearing authentication", async function () {
    const events: string[] = [];
    let finish!: () => void;
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "signout-download",
      isLive: () => true,
    });
    const scope = {
      grantId,
      kind: "acp-skill-run",
      ownerId: "signout-download",
    };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "institution", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => ({
        observe: async () => ({
          documentId: "paper",
          closed: false,
          loading: false,
          authentication: false,
          origin: "https://example.org",
          title: "Paper",
          text: "",
          targets: [{ label: "PDF", url: "https://example.org/paper.pdf" }],
        }),
        navigate: async () => {},
        close: async () => {
          events.push("close");
        },
        download: async (_url, _title, signal) => {
          signal.addEventListener("abort", () => events.push("cancel"), {
            once: true,
          });
          await new Promise<void>((resolve) => {
            finish = resolve;
          });
          return {
            path: "/private/file.pdf",
            contentType: "application/pdf",
            size: 100,
            pages: 1,
            readable: true,
            title: "Paper",
            identityMatched: true,
            dispose: async () => {
              events.push("disposed");
            },
          };
        },
      }),
      clearProfile: async () => {
        events.push("clear");
      },
      publishFile: async () => {
        throw new Error("unexpected publication");
      },
      releaseFiles: async () => {
        events.push("released");
      },
    });
    try {
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        scope,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const observed = await owner.observe({ pageRef: page.pageRef }, scope);
      await owner.download(
        {
          pageRef: page.pageRef,
          revision: observed.revision,
          targetRef: observed.targets[0].targetRef,
          idempotencyKey: "pdf",
        },
        scope,
      );
      const release = await Promise.race([
        owner.release({ sessionRef: page.sessionRef }, scope),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
      ]);
      assert.equal(release?.state, "released");
      const clearing = owner.signOutProfile("institution");
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.include(events, "cancel");
      assert.notInclude(events, "clear");
      finish();
      await clearing;
      assert.isBelow(events.indexOf("disposed"), events.indexOf("clear"));
      assert.isBelow(events.indexOf("released"), events.indexOf("clear"));
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });
  it("closes even a late-opening page before clearing only the selected profile", async function () {
    const events: string[] = [];
    let finishOpen!: (page: any) => void;
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "signout",
      isLive: () => true,
    });
    const scope = { grantId, kind: "acp-skill-run", ownerId: "signout" };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "institution", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: () =>
        new Promise((resolve) => {
          finishOpen = resolve;
        }),
      clearProfile: async (ref) => {
        events.push(`clear:${ref}`);
      },
      publishFile: async () => {
        throw new Error("unexpected");
      },
      releaseFiles: async () => {},
    });
    try {
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        scope,
      );
      const clearing = owner.signOutProfile("institution");
      assert.deepEqual(events, []);
      finishOpen({
        close: async () => {
          events.push("close");
        },
      });
      await clearing;
      assert.deepEqual(events, ["close", "clear:institution"]);
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, scope)).reason,
        "profile_signed_out",
      );
      const next = await owner
        .open({ parentRef: { libraryId: 1, key: "ITEM0002" } }, scope)
        .catch((e) => e);
      assert.equal(next.reason, "authentication_suppressed");
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });
  it("rejects parents that were not confirmed by this task's ingest", async function () {
    let opened = false;
    const grantId = issueAcquisitionGrant({
      kind: "acp-skill-run",
      ownerId: "unconfirmed-parent",
      isLive: () => true,
    });
    const scope = {
      grantId,
      kind: "acp-skill-run",
      ownerId: "unconfirmed-parent",
    };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => {
        opened = true;
        throw new Error("unexpected");
      },
      publishFile: async () => {
        throw new Error("unexpected");
      },
      releaseFiles: async () => {},
    });
    try {
      const result = await owner
        .open({ parentRef: { libraryId: 1, key: "ITEM0001" } }, scope)
        .catch((e) => e);
      assert.equal(result.reason, "parent_not_confirmed");
      assert.isFalse(opened);
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });
  it("suppresses another login immediately when the user closes a waiting page", async function () {
    let closedByUser: () => void = () => {};
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "close-task",
      isLive: () => true,
    });
    const scope = { grantId, kind: "acp-skill-run", ownerId: "close-task" };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => ({
        onClose: (listener: () => void) => {
          closedByUser = listener;
          return () => {};
        },
        observe: async () => ({
          documentId: "login",
          closed: false,
          loading: false,
          authentication: true,
          origin: "https://example.org",
          title: "",
          text: "",
          targets: [],
        }),
        navigate: async () => {},
        close: async () => {},
        download: async () => {
          throw new Error("not expected");
        },
      }),
      publishFile: async () => {
        throw new Error("not expected");
      },
      releaseFiles: async () => {},
    });
    try {
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        scope,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      await owner.observe({ pageRef: page.pageRef }, scope);
      closedByUser();
      const next = await owner
        .open({ parentRef: { libraryId: 1, key: "ITEM0002" } }, scope)
        .catch((e) => e);
      assert.equal(next.reason, "authentication_suppressed");
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, scope)).reason,
        "window_closed",
      );
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });

  it("does not publish a page after its grant expires during native opening", async function () {
    let live = true;
    let finishOpen!: (page: any) => void;
    let closed = 0;
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "late-open",
      isLive: () => live,
    });
    const scope = { grantId, kind: "acp-skill-run", ownerId: "late-open" };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: () =>
        new Promise((resolve) => {
          finishOpen = resolve;
        }),
      publishFile: async () => {
        throw new Error("not expected");
      },
      releaseFiles: async () => {},
    });
    try {
      await owner.open({ parentRef: { libraryId: 1, key: "ITEM0001" } }, scope);
      live = false;
      finishOpen({
        close: async () => {
          closed++;
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(closed, 1);
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });

  it("bounds concurrent page admission while allowing sequential batches", async function () {
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "pages-task",
      isLive: () => true,
    });
    const scope = { grantId, kind: "acp-skill-run", ownerId: "pages-task" };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => ({
        observe: async () => ({
          documentId: "paper",
          closed: false,
          loading: false,
          authentication: false,
          origin: "https://example.org",
          title: "Paper",
          text: "Paper",
          targets: [],
        }),
        navigate: async () => {},
        close: async () => {},
        download: async () => {
          throw new Error("not expected");
        },
      }),
      publishFile: async () => {
        throw new Error("not expected");
      },
      releaseFiles: async () => {},
    });
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 9 }, () =>
          owner.open({ parentRef: { libraryId: 1, key: "ITEM0001" } }, scope),
        ),
      );
      const opened = results.filter((result) => result.status === "fulfilled");
      assert.lengthOf(opened, 8);
      assert.equal(
        results.filter((result) => result.status === "rejected").length,
        1,
      );
      for (const result of opened)
        if (result.status === "fulfilled")
          await owner.release({ sessionRef: result.value.sessionRef }, scope);
      const next = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0002" } },
        scope,
      );
      assert.equal(next.state, "loading");
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });

  it("admits one download for concurrent retries and invalidates released files", async function () {
    let transfers = 0;
    let documentId = "paper";
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "retry-task",
      isLive: () => true,
    });
    const scope = { grantId, kind: "acp-skill-run", ownerId: "retry-task" };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => ({
        observe: async () => ({
          documentId,
          closed: false,
          loading: false,
          authentication: false,
          origin: "https://example.org",
          title: "Paper",
          text: "Paper",
          targets: [{ label: "PDF", url: "https://example.org/paper.pdf" }],
        }),
        navigate: async () => {},
        close: async () => {},
        download: async () => {
          transfers++;
          return {
            path: "/private/paper.pdf",
            contentType: "application/pdf",
            size: 100,
            pages: 1,
            readable: true,
            title: "Paper",
            identityMatched: true,
            dispose: async () => {},
          };
        },
      }),
      publishFile: async () => "file-local-pdf",
      releaseFiles: async () => {},
    });
    try {
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        scope,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const observed = await owner.observe({ pageRef: page.pageRef }, scope);
      const input = {
        pageRef: page.pageRef,
        revision: observed.revision,
        targetRef: observed.targets[0].targetRef,
        idempotencyKey: "paper-pdf",
      };
      const results = await Promise.all([
        owner.download(input, scope),
        owner.download(input, scope),
      ]);
      assert.equal(results[0].downloadRef, results[1].downloadRef);
      assert.equal(transfers, 1);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const ready = await owner.get_download(
        { downloadRef: results[0].downloadRef },
        scope,
      );
      assert.equal(ready.state, "ready");
      if (ready.state !== "ready") throw new Error("download not ready");
      const fileId = ready.file.fileId;
      ready.file.fileId = "caller-modified";
      assert.equal(
        (await owner.get_download({ downloadRef: ready.downloadRef }, scope))
          .file?.fileId,
        fileId,
      );
      documentId = "replacement";
      const stale = await owner
        .download({ ...input, idempotencyKey: "new-attempt" }, scope)
        .catch((e) => e);
      assert.equal(stale.reason, "stale_target");
      assert.equal(transfers, 1);
      await owner.release({ sessionRef: page.sessionRef }, scope);
      const released = await owner.get_download(
        { downloadRef: results[0].downloadRef },
        scope,
      );
      assert.equal(released.file, null);
      assert.equal(released.reason, "released");
      const conflict = await owner
        .download({ ...input, targetRef: "different" }, scope)
        .catch((e) => e);
      assert.equal(conflict.reason, "idempotency_conflict");
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });

  it("bounds active native transfers and ignores completion after cancellation", async function () {
    const finish: Array<(file: any) => void> = [];
    let disposed = 0;
    let published = 0;
    const grantId = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "download-limit",
      isLive: () => true,
    });
    const scope = { grantId, kind: "acp-skill-run", ownerId: "download-limit" };
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => ({
        observe: async () => ({
          documentId: "paper",
          closed: false,
          loading: false,
          authentication: false,
          origin: "https://example.org",
          title: "Paper",
          text: "Paper",
          targets: [{ label: "PDF", url: "https://example.org/paper.pdf" }],
        }),
        navigate: async () => {},
        close: async () => {},
        download: () => new Promise((resolve) => finish.push(resolve)),
      }),
      publishFile: async () => {
        published++;
        return "file-validated";
      },
      releaseFiles: async () => {},
    });
    try {
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        scope,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const observed = await owner.observe({ pageRef: page.pageRef }, scope);
      const input = {
        pageRef: page.pageRef,
        revision: observed.revision,
        targetRef: observed.targets[0].targetRef,
      };
      const first = await owner.download(
        { ...input, idempotencyKey: "first" },
        scope,
      );
      await owner.download({ ...input, idempotencyKey: "second" }, scope);
      const third = await owner
        .download({ ...input, idempotencyKey: "third" }, scope)
        .catch((e) => e);
      assert.equal(third.reason, "resource_limit");
      await owner.cancel_download({ downloadRef: first.downloadRef }, scope);
      assert.equal(
        (
          await owner
            .download({ ...input, idempotencyKey: "fourth" }, scope)
            .catch((e) => e)
        ).reason,
        "resource_limit",
      );
      const file = {
        path: "/private/paper.pdf",
        contentType: "application/pdf",
        size: 100,
        pages: 1,
        readable: true,
        title: "Paper",
        identityMatched: true,
        dispose: async () => {
          disposed++;
        },
      };
      for (const resolve of finish) resolve(file);
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(disposed, 1);
      assert.equal(published, 1);
      assert.equal(
        (await owner.get_download({ downloadRef: first.downloadRef }, scope))
          .state,
        "canceled",
      );
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });

  it("does not extend authentication waiting and suppresses reopening after timeout", async function () {
    let now = 100;
    let authentication = true;
    let closed = 0;
    const grantId = confirmedGrant({
      kind: "skillrunner-run",
      ownerId: "wait-task",
      isLive: () => true,
    });
    const scope = { grantId, kind: "skillrunner-run", ownerId: "wait-task" };
    const owner = createZoteroHostAcquisition({
      now: () => now,
      profiles: async () => [
        { authProfileRef: "profile", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => ({
        observe: async () => ({
          documentId: authentication ? "login" : "paper",
          closed: false,
          loading: false,
          authentication,
          origin: "https://login.example.org",
          title: "private",
          text: "private",
          targets: [],
        }),
        navigate: async () => {},
        close: async () => {
          closed++;
        },
        download: async () => {
          throw new Error("not expected");
        },
      }),
      publishFile: async () => {
        throw new Error("not expected");
      },
      releaseFiles: async () => {},
    });
    try {
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        scope,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const first = await owner.observe({ pageRef: page.pageRef }, scope);
      assert.equal(first.state, "awaiting_user");
      assert.equal(first.text, "");
      now += 300000;
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, scope)).authDeadline,
        first.authDeadline,
      );
      authentication = false;
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, scope)).state,
        "ready",
      );
      authentication = true;
      const second = await owner.observe({ pageRef: page.pageRef }, scope);
      assert.isAbove(second.authDeadline!, first.authDeadline!);
      now += 300000;
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, scope)).authDeadline,
        second.authDeadline,
      );
      now += 300001;
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, scope)).reason,
        "authentication_timeout",
      );
      assert.equal(closed, 1);
      const denied = await owner
        .open({ parentRef: { libraryId: 1, key: "ITEM0002" } }, scope)
        .catch((e) => e);
      assert.equal(denied.reason, "authentication_suppressed");
    } finally {
      revokeAcquisitionGrant(grantId);
    }
  });

  it("requires a live grant, isolates pages, and releases resources without signing out", async function () {
    let live = true;
    let opened = 0;
    let closed = 0;
    const grant = confirmedGrant({
      kind: "acp-skill-run",
      ownerId: "task-1",
      isLive: () => live,
    });
    const other = issueAcquisitionGrant({
      kind: "acp-skill-run",
      ownerId: "task-2",
      isLive: () => true,
    });
    const owner = createZoteroHostAcquisition({
      profiles: async () => [
        { authProfileRef: "profile-1", name: "Institution" },
      ],
      resolveParent: async () => ({
        title: "Paper",
        url: "https://example.org/paper",
      }),
      open: async () => {
        opened++;
        return {
          observe: async () => ({
            documentId: "doc-1",
            loading: false,
            closed: false,
            authentication: false,
            origin: "https://example.org",
            title: "Sample paper",
            text: "Article",
            targets: [],
          }),
          navigate: async () => {},
          close: async () => {
            closed++;
          },
          download: async () => {
            throw new Error("not expected");
          },
        };
      },
      publishFile: async () => {
        throw new Error("not expected");
      },
      releaseFiles: async () => {},
    });
    const auth = { grantId: grant, kind: "acp-skill-run", ownerId: "task-1" };
    try {
      const denied = await owner
        .profiles({ ...auth, grantId: "forged" })
        .catch((e) => e);
      assert.equal(denied.code, "permission_denied");
      const page = await owner.open(
        { parentRef: { libraryId: 1, key: "ITEM0001" } },
        auth,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(opened, 1);
      assert.equal(
        (await owner.observe({ pageRef: page.pageRef }, auth)).state,
        "ready",
      );
      const crossTask = await owner
        .observe(
          { pageRef: page.pageRef },
          { grantId: other, kind: "acp-skill-run", ownerId: "task-2" },
        )
        .catch((e) => e);
      assert.equal(crossTask.code, "permission_denied");
      await owner.release({ sessionRef: page.sessionRef }, auth);
      assert.equal(closed, 1);
      assert.lengthOf((await owner.profiles(auth)).profiles, 1);
      live = false;
      const expired = await owner.profiles(auth).catch((e) => e);
      assert.equal(expired.code, "permission_denied");
    } finally {
      revokeAcquisitionGrant(grant);
      revokeAcquisitionGrant(other);
    }
  });
});
