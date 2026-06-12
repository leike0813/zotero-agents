function compareByDateAndName(left, right, helpers) {
  const dateDelta =
    helpers.getAttachmentDateAdded(left) -
    helpers.getAttachmentDateAdded(right);
  if (dateDelta !== 0) {
    return dateDelta;
  }
  return helpers
    .getAttachmentFileName(left)
    .localeCompare(helpers.getAttachmentFileName(right));
}

function chooseMarkdownByPdfOrEarliest(mdEntries, pdfEntries, helpers) {
  const earliestPdf = helpers.pickEarliestPdfAttachment(pdfEntries);
  if (earliestPdf) {
    const stem = helpers.getAttachmentFileStem(earliestPdf);
    const matched = mdEntries.find(
      (entry) => helpers.getAttachmentFileStem(entry) === stem,
    );
    if (matched) {
      return matched;
    }
  }

  const sortedMds = [...mdEntries].sort((a, b) =>
    compareByDateAndName(a, b, helpers),
  );
  return sortedMds[0] || null;
}

export function chooseLiteratureSourceByPolicy(mdEntries, pdfEntries, helpers) {
  if (mdEntries.length > 0) {
    if (mdEntries.length === 1) {
      return mdEntries[0];
    }
    return chooseMarkdownByPdfOrEarliest(mdEntries, pdfEntries, helpers);
  }
  if (pdfEntries.length > 0) {
    const sortedPdfs = [...pdfEntries].sort((a, b) =>
      compareByDateAndName(a, b, helpers),
    );
    return sortedPdfs[0] || null;
  }
  return null;
}

export function collectSelectedLiteratureSources({
  selectionContext,
  helpers,
  shouldIncludeParent = () => true,
}) {
  const selectedParents = selectionContext?.items?.parents || [];
  const selectedAttachments = selectionContext?.items?.attachments || [];
  const selectedParentIds = new Set(
    selectedParents.map((entry) => entry?.item?.id).filter(Boolean),
  );
  const byParent = new Map();

  for (const parent of selectedParents) {
    const parentId = parent?.item?.id;
    if (!parentId || !shouldIncludeParent(parentId)) {
      continue;
    }
    const allAttachments = parent?.attachments || [];
    const mdEntries = allAttachments.filter((entry) =>
      helpers.isMarkdownAttachment(entry),
    );
    const pdfEntries = allAttachments.filter((entry) =>
      helpers.isPdfAttachment(entry),
    );
    const resolved = chooseLiteratureSourceByPolicy(
      mdEntries,
      pdfEntries,
      helpers,
    );
    if (resolved) {
      byParent.set(parentId, resolved);
    }
  }

  const groupedByParent = new Map();
  for (const entry of selectedAttachments) {
    const parentId = helpers.getAttachmentParentId(entry);
    if (
      !parentId ||
      selectedParentIds.has(parentId) ||
      !shouldIncludeParent(parentId)
    ) {
      continue;
    }
    if (
      !helpers.isMarkdownAttachment(entry) &&
      !helpers.isPdfAttachment(entry)
    ) {
      continue;
    }
    const bucket = groupedByParent.get(parentId) || {
      mdEntries: [],
      pdfEntries: [],
    };
    if (helpers.isMarkdownAttachment(entry)) {
      bucket.mdEntries.push(entry);
    } else if (helpers.isPdfAttachment(entry)) {
      bucket.pdfEntries.push(entry);
    }
    groupedByParent.set(parentId, bucket);
  }

  for (const [parentId, grouped] of groupedByParent.entries()) {
    if (byParent.has(parentId)) {
      continue;
    }
    const resolved = chooseLiteratureSourceByPolicy(
      grouped.mdEntries,
      grouped.pdfEntries,
      helpers,
    );
    if (resolved) {
      byParent.set(parentId, resolved);
    }
  }

  return Array.from(byParent.values());
}
