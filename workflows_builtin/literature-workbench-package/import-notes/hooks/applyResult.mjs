import {
  loadImportSchemas,
  normalizeImportedCitationPayload,
  normalizeImportedReferencesPayload,
  validateImportedCitationPayload,
  validateImportedReferencesPayload,
} from "../../lib/importSchemas.mjs";
import { getBaseName } from "../../lib/path.mjs";
import {
  importCustomNotes,
  upsertLiteratureDigestGeneratedNotes,
} from "../../lib/literatureDigestNotes.mjs";
import { applyLiteratureDigestSidecar } from "../../lib/literatureDigestSidecar.mjs";
import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import { resolveRepresentativeImageMarkdownImportCandidate } from "../../lib/representativeImage.mjs";
import { buildLiteratureScorePayload } from "../../lib/literatureScoreNote.mjs";
import {
  portableItemRef,
  readHostPages,
  requireHostApi,
  requireHostEditor,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";

const ROW_KIND_ORDER = [
  "digest",
  "references",
  "citation-analysis",
  "literature-score",
];

export function getSelectedImportCandidateForKind(state, kind) {
  if (kind === "citation-analysis") {
    return state?.citationAnalysis || null;
  }
  if (kind === "digest") {
    return state?.digest || null;
  }
  if (kind === "references") {
    return state?.references || null;
  }
  if (kind === "literature-score") {
    return state?.literatureScore || null;
  }
  return null;
}

function clearSelectedImportCandidateForKind(draft, kind) {
  if (kind === "citation-analysis") {
    draft.citationAnalysis = null;
    draft.errors["citation-analysis"] = "";
    return;
  }
  if (kind === "digest") {
    draft.digest = null;
    draft.errors.digest = "";
    return;
  }
  if (kind === "references") {
    draft.references = null;
    draft.errors.references = "";
    return;
  }
  if (kind === "literature-score") {
    draft.literatureScore = null;
    draft.errors["literature-score"] = "";
  }
}

function createHtmlElement(doc, tag) {
  return doc.createElementNS
    ? doc.createElementNS("http://www.w3.org/1999/xhtml", tag)
    : doc.createElement(tag);
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function getKindLabel(kind) {
  if (kind === "digest") {
    return "Digest note";
  }
  if (kind === "references") {
    return "References note";
  }
  if (kind === "literature-score") {
    return "Literature score note";
  }
  return "Citation analysis note";
}

function getPickerTitle(kind) {
  if (kind === "digest") {
    return "Import Digest";
  }
  if (kind === "references") {
    return "Import References";
  }
  if (kind === "literature-score") {
    return "Import Literature Score";
  }
  return "Import Citation Analysis";
}

function getPickerFilters(kind) {
  if (kind === "digest") {
    return [{ label: "Markdown", extensions: ["md"] }];
  }
  return [{ label: "JSON", extensions: ["json"] }];
}

function getRepresentativeImageStatus(digest) {
  const representativeImage = digest?.representativeImage || null;
  if (!digest) {
    return "Select digest first";
  }
  if (!representativeImage) {
    return "Representative image: none";
  }
  if (representativeImage.status === "selected") {
    const mode = String(representativeImage.mode || "manual").trim();
    return `Representative image: ${mode} (${getBaseName(representativeImage.sourcePath)})`;
  }
  if (representativeImage.status === "skipped") {
    return `Representative image skipped: ${String(representativeImage.reason || "unavailable").trim()}`;
  }
  return "Representative image: none";
}

function formatValidationError(errors) {
  const first = Array.isArray(errors) && errors.length > 0 ? errors[0] : "";
  return String(first || "validation failed").trim();
}

async function buildNonInteractiveSelection({ host, runtime }) {
  const resources = host.resources;
  const selected = {
    digest: null,
    references: null,
    citationAnalysis: null,
    literatureScore: null,
    customNotes: [],
  };
  const digest = resources?.getInput("digest");
  if (digest) {
    const markdown = await host.file.readText(digest.path);
    const resolved = await resolveRepresentativeImageMarkdownImportCandidate({
      runtime,
      digestPath: digest.path,
      markdown,
    });
    selected.digest = {
      sourcePath: digest.path,
      markdown: resolved.markdown,
      representativeImage: resolved.representativeImage,
    };
  }
  const schemas = await loadImportSchemas(runtime);
  const references = resources?.getInput("references");
  if (references) {
    const payload = normalizeImportedReferencesPayload(
      JSON.parse(await host.file.readText(references.path)),
    );
    const validation = validateImportedReferencesPayload(
      payload,
      schemas.referencesSchema,
    );
    if (!validation.valid) throw new Error(formatValidationError(validation.errors));
    selected.references = {
      sourcePath: references.path,
      payload: { ...payload, entry: payload.entry || references.path },
    };
  }
  const citation = resources?.getInput("citation-analysis");
  if (citation) {
    const payload = normalizeImportedCitationPayload(
      JSON.parse(await host.file.readText(citation.path)),
    );
    const validation = validateImportedCitationPayload(
      payload,
      schemas.citationSchema,
    );
    if (!validation.valid) throw new Error(formatValidationError(validation.errors));
    selected.citationAnalysis = {
      sourcePath: citation.path,
      payload: { ...payload, entry: payload.entry || citation.path },
    };
  }
  const literatureScore = resources?.getInput("literature-score");
  if (literatureScore) {
    selected.literatureScore = {
      sourcePath: literatureScore.path,
      payload: buildLiteratureScorePayload(
        JSON.parse(await host.file.readText(literatureScore.path)),
        literatureScore.path,
      ),
    };
  }
  selected.customNotes = (resources?.getInputs("custom-notes") || []).map(
    (file) => ({
      sourcePath: file.path,
      fileName: getBaseName(file.displayName).replace(/\.md$/i, ""),
    }),
  );
  return selected;
}

function conflictPolicyError(conflictedKinds) {
  const error = new Error(
    `import-notes conflicts require an explicit non-interactive policy: ${conflictedKinds.join(", ")}`,
  );
  error.code = "workflow_conflict_requires_policy";
  error.details = { conflictedKinds };
  return error;
}

function createImportRenderer(args) {
  return {
    render({ doc, root, state, context, host }) {
      clearChildren(root);
      const panel = createHtmlElement(doc, "div");
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = "10px";
      panel.style.padding = "6px";

      const title = createHtmlElement(doc, "h3");
      title.textContent = "Import Notes";
      title.style.margin = "0";
      panel.appendChild(title);

      const subtitle = createHtmlElement(doc, "div");
      subtitle.style.fontSize = "12px";
      subtitle.style.color = "#555";
      subtitle.textContent = `Parent: ${String(context?.parentTitle || "").trim()}`;
      panel.appendChild(subtitle);

      for (const kind of ROW_KIND_ORDER) {
        const row = createHtmlElement(doc, "div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "180px 1fr auto auto";
        row.style.gap = "8px";
        row.style.alignItems = "center";
        row.style.border = "1px solid #d8d8dd";
        row.style.borderRadius = "6px";
        row.style.padding = "8px";

        const label = createHtmlElement(doc, "div");
        label.textContent = getKindLabel(kind);
        row.appendChild(label);

        const status = createHtmlElement(doc, "div");
        status.style.fontSize = "12px";
        const existing = state.existing?.[kind] === true;
        const candidate = getSelectedImportCandidateForKind(state, kind);
        const errorMessage = String(state.errors?.[kind] || "").trim();
        status.textContent = [
          existing ? "Existing: yes" : "Existing: no",
          candidate?.sourcePath
            ? `Selected: ${getBaseName(candidate.sourcePath)}`
            : "Selected: none",
          errorMessage ? `Error: ${errorMessage}` : "Status: ready",
        ].join(" | ");
        row.appendChild(status);

        const chooseButton = createHtmlElement(doc, "button");
        chooseButton.type = "button";
        chooseButton.textContent = "Choose File";
        chooseButton.addEventListener("click", async () => {
          const selectedPath = await args.host.file.pickFile({
            title: getPickerTitle(kind),
            filters: getPickerFilters(kind),
          });
          if (!selectedPath) {
            return;
          }
          try {
            const content = await args.host.file.readText(selectedPath);
            const schemas = await loadImportSchemas(args.runtime);
            host.patchState((draft) => {
              draft.errors = draft.errors || {};
            });
            if (kind === "digest") {
              const resolved =
                await resolveRepresentativeImageMarkdownImportCandidate({
                  runtime: args.runtime,
                  digestPath: selectedPath,
                  markdown: content,
                });
              host.patchState((draft) => {
                draft.digest = {
                  sourcePath: selectedPath,
                  markdown: resolved.markdown,
                  representativeImage: resolved.representativeImage,
                };
                draft.errors.digest = "";
              });
              return;
            }
            const parsed = JSON.parse(content);
            if (kind === "references") {
              const validation = validateImportedReferencesPayload(
                parsed,
                schemas.referencesSchema,
              );
              if (!validation.valid) {
                host.patchState((draft) => {
                  draft.references = null;
                  draft.errors.references = formatValidationError(
                    validation.errors,
                  );
                });
                return;
              }
              const normalized = normalizeImportedReferencesPayload(parsed);
              if (!normalized.entry) {
                normalized.entry = selectedPath;
              }
              host.patchState((draft) => {
                draft.references = {
                  sourcePath: selectedPath,
                  payload: normalized,
                };
                draft.errors.references = "";
              });
              return;
            }

            if (kind === "literature-score") {
              host.patchState((draft) => {
                draft.literatureScore = {
                  sourcePath: selectedPath,
                  payload: buildLiteratureScorePayload(parsed, selectedPath),
                };
                draft.errors["literature-score"] = "";
              });
              return;
            }

            const validation = validateImportedCitationPayload(
              parsed,
              schemas.citationSchema,
            );
            if (!validation.valid) {
              host.patchState((draft) => {
                draft.citationAnalysis = null;
                draft.errors["citation-analysis"] = formatValidationError(
                  validation.errors,
                );
              });
              return;
            }
            const normalized = normalizeImportedCitationPayload(parsed);
            if (!normalized.entry) {
              normalized.entry = selectedPath;
            }
            host.patchState((draft) => {
              draft.citationAnalysis = {
                sourcePath: selectedPath,
                payload: normalized,
              };
              draft.errors["citation-analysis"] = "";
            });
          } catch (error) {
            host.patchState((draft) => {
              clearSelectedImportCandidateForKind(draft, kind);
              draft.errors[kind] = String(
                error?.message || error || "import failed",
              );
            });
          }
        });
        row.appendChild(chooseButton);

        const clearButton = createHtmlElement(doc, "button");
        clearButton.type = "button";
        clearButton.textContent = "Clear";
        clearButton.addEventListener("click", () => {
          host.patchState((draft) => {
            clearSelectedImportCandidateForKind(draft, kind);
          });
        });
        row.appendChild(clearButton);

        panel.appendChild(row);

        if (kind === "digest") {
          const imageRow = createHtmlElement(doc, "div");
          imageRow.style.display = "grid";
          imageRow.style.gridTemplateColumns = "180px 1fr auto auto";
          imageRow.style.gap = "8px";
          imageRow.style.alignItems = "center";
          imageRow.style.border = "1px solid #d8d8dd";
          imageRow.style.borderRadius = "6px";
          imageRow.style.padding = "8px";
          imageRow.style.marginTop = "-4px";

          const imageLabel = createHtmlElement(doc, "div");
          imageLabel.textContent = "Representative image";
          imageRow.appendChild(imageLabel);

          const imageStatus = createHtmlElement(doc, "div");
          imageStatus.style.fontSize = "12px";
          imageStatus.textContent = getRepresentativeImageStatus(state.digest);
          imageRow.appendChild(imageStatus);

          const chooseImageButton = createHtmlElement(doc, "button");
          chooseImageButton.type = "button";
          chooseImageButton.textContent = "Choose Image";
          chooseImageButton.disabled = !state.digest;
          chooseImageButton.addEventListener("click", async () => {
            if (!state.digest) {
              return;
            }
            const selectedImagePath = await args.host.file.pickFile({
              title: "Import Representative Image",
              filters: [
                {
                  label: "Images",
                  extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp"],
                },
              ],
            });
            if (!selectedImagePath) {
              return;
            }
            host.patchState((draft) => {
              if (!draft.digest) {
                return;
              }
              draft.digest.representativeImage = {
                status: "selected",
                sourcePath: selectedImagePath,
                alt: getBaseName(selectedImagePath),
                mode: "manual",
              };
            });
          });
          imageRow.appendChild(chooseImageButton);

          const clearImageButton = createHtmlElement(doc, "button");
          clearImageButton.type = "button";
          clearImageButton.textContent = "Clear Image";
          clearImageButton.disabled = !state.digest?.representativeImage;
          clearImageButton.addEventListener("click", () => {
            host.patchState((draft) => {
              if (draft.digest) {
                draft.digest.representativeImage = null;
              }
            });
          });
          imageRow.appendChild(clearImageButton);

          panel.appendChild(imageRow);
        }
      }

      // Custom notes import section
      const customSection = createHtmlElement(doc, "div");
      customSection.style.display = "flex";
      customSection.style.flexDirection = "column";
      customSection.style.gap = "8px";
      customSection.style.border = "1px solid #d8d8dd";
      customSection.style.borderRadius = "6px";
      customSection.style.padding = "8px";
      customSection.style.marginTop = "8px";

      const customTitle = createHtmlElement(doc, "h4");
      customTitle.textContent = "Custom Notes";
      customTitle.style.margin = "0 0 8px 0";
      customTitle.style.fontSize = "13px";
      customSection.appendChild(customTitle);

      const customButtonRow = createHtmlElement(doc, "div");
      customButtonRow.style.display = "flex";
      customButtonRow.style.gap = "8px";
      customButtonRow.style.alignItems = "center";

      const importCustomButton = createHtmlElement(doc, "button");
      importCustomButton.type = "button";
      importCustomButton.textContent = "Import Custom Note(s)";
      importCustomButton.addEventListener("click", async () => {
        try {
          const selectedPaths = await args.host.file.pickFiles({
            title: "Import Custom Notes",
            filters: [{ label: "Markdown", extensions: ["md"] }],
          });
          if (!Array.isArray(selectedPaths) || selectedPaths.length === 0) {
            return;
          }
          const newCustomNotes = selectedPaths.map((path) => ({
            sourcePath: path,
            fileName: getBaseName(path).replace(/\.md$/i, ""),
          }));
          host.patchState((draft) => {
            draft.customNotes = [
              ...(draft.customNotes || []),
              ...newCustomNotes,
            ];
            draft.errors.customNotes = "";
          });
        } catch (error) {
          host.patchState((draft) => {
            draft.errors.customNotes = String(
              error?.message || error || "custom note import failed",
            );
          });
        }
      });
      customButtonRow.appendChild(importCustomButton);

      customSection.appendChild(customButtonRow);

      const customListContainer = createHtmlElement(doc, "div");
      customListContainer.style.maxHeight = "150px";
      customListContainer.style.overflowY = "auto";
      customListContainer.style.fontSize = "12px";

      const customError = createHtmlElement(doc, "div");
      customError.style.fontSize = "12px";
      customError.style.color = "#b00020";
      customError.style.minHeight = "16px";

      const renderCustomList = () => {
        clearChildren(customListContainer);
        customError.textContent = String(
          state.errors?.customNotes || "",
        ).trim();
        const customNotes = state.customNotes || [];
        if (customNotes.length === 0) {
          const emptyMsg = createHtmlElement(doc, "div");
          emptyMsg.textContent = "No custom notes selected";
          emptyMsg.style.color = "#888";
          emptyMsg.style.padding = "4px";
          customListContainer.appendChild(emptyMsg);
          return;
        }
        customNotes.forEach((note, index) => {
          const itemRow = createHtmlElement(doc, "div");
          itemRow.style.display = "grid";
          itemRow.style.gridTemplateColumns = "1fr auto";
          itemRow.style.gap = "8px";
          itemRow.style.alignItems = "center";
          itemRow.style.padding = "4px";
          itemRow.style.borderBottom = "1px solid #eee";

          const itemLabel = createHtmlElement(doc, "span");
          itemLabel.textContent = `${index + 1}. ${note.fileName || "untitled"} (${getBaseName(note.sourcePath)})`;
          itemLabel.style.overflow = "hidden";
          itemLabel.style.textOverflow = "ellipsis";
          itemLabel.style.whiteSpace = "nowrap";
          itemRow.appendChild(itemLabel);

          const removeButton = createHtmlElement(doc, "button");
          removeButton.type = "button";
          removeButton.textContent = "Remove";
          removeButton.style.fontSize = "11px";
          removeButton.style.padding = "2px 6px";
          removeButton.addEventListener("click", () => {
            host.patchState((draft) => {
              draft.customNotes = (draft.customNotes || []).filter(
                (_, i) => i !== index,
              );
            });
          });
          itemRow.appendChild(removeButton);

          customListContainer.appendChild(itemRow);
        });
      };

      renderCustomList();
      customSection.appendChild(customError);
      customSection.appendChild(customListContainer);

      panel.appendChild(customSection);

      root.appendChild(panel);
    },
    serialize({ state }) {
      return cloneSerializable({
        digest: state.digest || null,
        references: state.references || null,
        citationAnalysis: state.citationAnalysis || null,
        literatureScore: state.literatureScore || null,
        customNotes: state.customNotes || [],
      });
    },
  };
}

function createConflictRenderer() {
  return {
    render({ doc, root, context }) {
      clearChildren(root);
      const panel = createHtmlElement(doc, "div");
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = "8px";
      panel.style.padding = "12px";

      const title = createHtmlElement(doc, "h3");
      title.textContent = "Overwrite Existing Notes?";
      title.style.margin = "0";
      panel.appendChild(title);

      const body = createHtmlElement(doc, "div");
      body.style.fontSize = "13px";
      body.textContent = `The parent item already has ${String(
        (context?.conflictedKinds || []).map(getKindLabel).join(", "),
      )}.`;
      panel.appendChild(body);

      root.appendChild(panel);
    },
    serialize() {
      return {};
    },
  };
}

async function openImportEditor(args) {
  const editor = requireHostEditor(args.runtime);
  return editor.openSession({
    title: "Import Notes",
    initialState: cloneSerializable(args.initialState),
    renderer: createImportRenderer({
      runtime: args.runtime,
      host: requireHostApi(args.runtime),
    }),
    context: {
      parentTitle: args.parentTitle,
      existing: args.existing,
    },
    labels: {
      save: "Import",
      cancel: "Cancel",
    },
    layout: {
      width: 980,
      height: 520,
      minWidth: 860,
      minHeight: 460,
    },
  });
}

async function openConflictDialog(args) {
  const editor = requireHostEditor(args.runtime);
  return editor.openSession({
    title: "Overwrite Existing Notes",
    initialState: {},
    renderer: createConflictRenderer(),
    context: {
      conflictedKinds: args.conflictedKinds,
    },
    labels: {
      save: "Overwrite",
      cancel: "Cancel",
    },
    actions: [
      {
        id: "overwrite",
        label: "Overwrite",
      },
      {
        id: "skip",
        label: "Do Not Overwrite",
      },
      {
        id: "cancel",
        label: "Cancel",
      },
    ],
    closeActionId: "cancel",
    detached: true,
    layout: {
      width: 520,
      height: 240,
      minWidth: 520,
      minHeight: 240,
    },
  });
}

async function resolveExistingGeneratedKinds(parentItem, runtime) {
  const existing = {
    digest: false,
    references: false,
    "citation-analysis": false,
    "literature-score": false,
  };
  const host = requireHostApi(runtime);
  for (const note of await readHostPages({
    readPage: (page) =>
      host.library.getItemNotes(portableItemRef(parentItem), page),
    getItems: (page) => page.notes,
    operation: "import-notes note read",
  })) {
    const noteItem = await host.library.getNoteDetail(note.ref, { format: "html" });
    const kind = parseGeneratedNoteKind(noteItem.content);
    if (kind === "digest") {
      existing.digest = true;
    }
    if (kind === "references") {
      existing.references = true;
    }
    if (kind === "citation-analysis") {
      existing["citation-analysis"] = true;
    }
    if (kind === "literature-score") {
      existing["literature-score"] = true;
    }
  }
  return existing;
}

function countSelectedCandidates(selection) {
  return [
    selection?.digest,
    selection?.references,
    selection?.citationAnalysis,
    selection?.literatureScore,
  ].filter(Boolean).length;
}

function countCustomNotes(selection) {
  return Array.isArray(selection?.customNotes)
    ? selection.customNotes.length
    : 0;
}

function buildImportedRepresentativeImageRequest(digest) {
  const candidate = digest?.representativeImage || null;
  if (!candidate) {
    return null;
  }
  if (candidate.status !== "selected") {
    return {
      skippedResult: {
        status: "skipped",
        reason: String(candidate.reason || "representative_image_unavailable"),
        sourcePath: String(candidate.imagePath || candidate.sourcePath || ""),
        imagePath: String(candidate.imagePath || candidate.sourcePath || ""),
        locator: {
          status: "selected",
          source_kind: "imported_digest_markdown",
          label: String(candidate.alt || "Representative image").trim(),
          markdown_src_hint: String(candidate.src || "").trim(),
          selection_reason: "Imported by import-notes",
          confidence: "high",
        },
      },
    };
  }
  const imagePath = String(
    candidate.sourcePath || candidate.imagePath || "",
  ).trim();
  if (!imagePath) {
    return {
      skippedResult: {
        status: "skipped",
        reason: "representative_image_source_missing",
        locator: {
          status: "selected",
          source_kind: "imported_digest_markdown",
          label: String(candidate.alt || "Representative image").trim(),
          markdown_src_hint: String(candidate.src || "").trim(),
          selection_reason: "Imported by import-notes",
          confidence: "high",
        },
      },
    };
  }
  return {
    imagePath,
    strategy:
      String(candidate.mode || "").trim() === "auto"
        ? "imported_markdown_marker"
        : "manual_import",
    locator: {
      status: "selected",
      source_kind: "imported_digest_markdown",
      label: String(candidate.alt || "Representative image").trim(),
      caption_quote: "",
      markdown_src_hint: String(candidate.src || "").trim(),
      selection_reason: "Imported by import-notes",
      confidence: "high",
    },
  };
}

async function findAppliedGeneratedNote(host, notes, kind) {
  for (const note of notes || []) {
    const detail = await host.library.getNoteDetail(note.ref, { format: "html" });
    if (parseGeneratedNoteKind(detail.content) === kind) return detail;
  }
  return null;
}

async function applyImportedStandardSidecar(args) {
  if (
    !args.selected?.digest &&
    !args.selected?.references &&
    !args.selected?.citationAnalysis
  ) {
    return undefined;
  }
  const selected = args.selected || {};
  const host = requireHostApi(args.runtime);
  const digestNote = selected.digest
    ? await findAppliedGeneratedNote(host, args.applied?.notes, "digest")
    : null;
  const referencesNote = selected.references
    ? await findAppliedGeneratedNote(host, args.applied?.notes, "references")
    : null;
  const citationAnalysisNote = selected.citationAnalysis
    ? await findAppliedGeneratedNote(
        host,
        args.applied?.notes,
        "citation-analysis",
      )
    : null;

  return applyLiteratureDigestSidecar({
    runtime: args.runtime,
    parentItem: args.parentItem,
    sourceWorkflow: "import-notes",
    digestNote,
    digestText: selected.digest
      ? String(selected.digest.markdown || "")
      : undefined,
    digestEntryPath: selected.digest?.sourcePath,
    referencesNote,
    referencesPayload: selected.references?.payload,
    referencesEntryPath:
      selected.references?.sourcePath || selected.references?.payload?.entry,
    citationAnalysisNote,
    citationAnalysisPayload: selected.citationAnalysis?.payload,
    citationAnalysisEntryPath:
      selected.citationAnalysis?.sourcePath ||
      selected.citationAnalysis?.payload?.entry,
  });
}

async function applySelectedImportBatch(args) {
  let importedCount = 0;
  let representativeImage = {
    status: "none",
  };
  let sidecarApply;

  if (args.standardCount > 0) {
    const applied = await upsertLiteratureDigestGeneratedNotes({
      runtime: args.runtime,
      parentItem: args.parentItem,
      digest: args.selected.digest
        ? {
            payload: {
              version: 1,
              entry: String(args.selected.digest.sourcePath || "").trim(),
              format: "markdown",
              content: String(args.selected.digest.markdown || ""),
            },
            representativeImage: buildImportedRepresentativeImageRequest(
              args.selected.digest,
            ),
          }
        : null,
      references: args.selected.references
        ? {
            payload: args.selected.references.payload,
          }
        : null,
      citationAnalysis: args.selected.citationAnalysis
        ? {
            payload: args.selected.citationAnalysis.payload,
          }
        : null,
      literatureScore: args.selected.literatureScore
        ? {
            payload: args.selected.literatureScore.payload,
          }
        : null,
    });
    importedCount += applied.notes.length;
    representativeImage = applied.representative_image || representativeImage;
    sidecarApply = await applyImportedStandardSidecar({
      runtime: args.runtime,
      parentItem: args.parentItem,
      selected: args.selected,
      standardCount: args.standardCount,
      applied,
    });
  }

  if (args.customCount > 0) {
    const customApplied = await importCustomNotes({
      runtime: args.runtime,
      parentItem: args.parentItem,
      customNotes: args.selected.customNotes || [],
    });
    importedCount += customApplied.notes.length;
  }

  return {
    imported: importedCount,
    representative_image: representativeImage,
    ...(sidecarApply !== undefined
      ? {
          sidecar_apply: sidecarApply,
        }
      : {}),
  };
}

function findConflictedKinds(selected, existing) {
  return [
    selected.digest && existing.digest ? "digest" : "",
    selected.references && existing.references ? "references" : "",
    selected.citationAnalysis && existing["citation-analysis"]
      ? "citation-analysis"
      : "",
    selected.literatureScore && existing["literature-score"]
      ? "literature-score"
      : "",
  ].filter(Boolean);
}

function buildAppliedImportResult(applied) {
  return {
    imported: applied.imported,
    skipped: 0,
    representative_image: applied.representative_image,
    ...(applied.sidecar_apply !== undefined
      ? {
          sidecar_apply: applied.sidecar_apply,
        }
      : {}),
  };
}

async function applyNonInteractiveImport(args) {
  const host = requireHostApi(args.runtime);
  const selected = await buildNonInteractiveSelection({
    host,
    runtime: args.runtime,
  });
  const standardCount = countSelectedCandidates(selected);
  const customCount = countCustomNotes(selected);
  if (standardCount === 0 && customCount === 0) {
    return { imported: 0, skipped: 0 };
  }
  const conflictedKinds = findConflictedKinds(selected, args.existing);
  const conflictPolicy = String(
    args.executionOptions?.workflowParams?.conflictPolicy || "error",
  ).trim();
  if (conflictedKinds.length > 0) {
    if (conflictPolicy === "error") {
      throw conflictPolicyError(conflictedKinds);
    }
    if (conflictPolicy === "skip") {
      return {
        imported: 0,
        skipped: standardCount + customCount,
      };
    }
  }
  const applied = await applySelectedImportBatch({
    runtime: args.runtime,
    parentItem: args.parentItem,
    selected,
    standardCount,
    customCount,
  });
  return buildAppliedImportResult(applied);
}

async function applyResultImpl({ parent, runtime, executionOptions }) {
  const host = requireHostApi(runtime);
  const parentItem = (await host.library.getItemDetail(portableItemRef(parent))).item;
  const existing = await resolveExistingGeneratedKinds(parentItem, runtime);
  if (
    runtime.invocationMode === "non-interactive" ||
    host.interactionMode === "non_interactive"
  ) {
    return applyNonInteractiveImport({
      runtime,
      executionOptions,
      parentItem,
      existing,
    });
  }
  const parentTitle = String(parentItem.title || "").trim();
  let selectionState = {
    digest: null,
    references: null,
    citationAnalysis: null,
    literatureScore: null,
    customNotes: [],
    errors: {
      digest: "",
      references: "",
      "citation-analysis": "",
      "literature-score": "",
      customNotes: "",
    },
    existing,
  };

  while (true) {
    const editorResult = await openImportEditor({
      runtime,
      parentTitle,
      existing,
      initialState: selectionState,
    });
    if (!editorResult || editorResult.saved !== true) {
      throw new Error(
        `import-notes canceled by user: ${String(editorResult?.reason || "canceled").trim()}`,
      );
    }
    const selected = cloneSerializable(editorResult.result || {});
    const standardCount = countSelectedCandidates(selected);
    const customCount = countCustomNotes(selected);
    if (standardCount === 0 && customCount === 0) {
      return {
        imported: 0,
        skipped: 0,
      };
    }

    const conflictedKinds = findConflictedKinds(selected, existing);

    if (conflictedKinds.length === 0) {
      const applied = await applySelectedImportBatch({
        runtime,
        parentItem,
        selected,
        standardCount,
        customCount,
      });
      return buildAppliedImportResult(applied);
    }

    const conflictResult = await openConflictDialog({
      runtime,
      conflictedKinds,
    });
    const actionId = String(conflictResult?.actionId || "cancel").trim();
    if (actionId === "overwrite") {
      const applied = await applySelectedImportBatch({
        runtime,
        parentItem,
        selected,
        standardCount,
        customCount,
      });
      return buildAppliedImportResult(applied);
    }
    if (actionId === "skip") {
      return {
        imported: 0,
        skipped: standardCount + customCount,
      };
    }

    selectionState = {
      ...selectionState,
      digest: selected.digest || null,
      references: selected.references || null,
      citationAnalysis: selected.citationAnalysis || null,
      literatureScore: selected.literatureScore || null,
      customNotes: selected.customNotes || [],
    };
  }
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
