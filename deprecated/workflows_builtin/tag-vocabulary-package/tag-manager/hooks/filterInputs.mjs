function cloneSelectionContext(selectionContext) {
  if (!selectionContext || typeof selectionContext !== "object") {
    return {};
  }
  return JSON.parse(JSON.stringify(selectionContext));
}

function resetSummary(summary) {
  if (!summary || typeof summary !== "object") {
    return {
      parentCount: 0,
      childCount: 0,
      attachmentCount: 0,
      noteCount: 0,
    };
  }
  return {
    ...summary,
    parentCount: 0,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  };
}

export function filterInputs({ selectionContext }) {
  const cloned = cloneSelectionContext(selectionContext);
  const items = cloned.items || {};
  const parents = Array.isArray(items.parents) ? items.parents : [];
  const notes = Array.isArray(items.notes) ? items.notes : [];
  const attachments = Array.isArray(items.attachments) ? items.attachments : [];
  const children = Array.isArray(items.children) ? items.children : [];

  cloned.items = {
    parents: [],
    notes: [],
    attachments: [],
    children: [],
  };
  cloned.summary = resetSummary(cloned.summary);

  if (parents.length > 0) {
    cloned.items.parents = [parents[0]];
    cloned.summary.parentCount = 1;
    return cloned;
  }
  if (notes.length > 0) {
    cloned.items.notes = [notes[0]];
    cloned.summary.noteCount = 1;
    return cloned;
  }
  if (attachments.length > 0) {
    cloned.items.attachments = [attachments[0]];
    cloned.summary.attachmentCount = 1;
    return cloned;
  }
  if (children.length > 0) {
    cloned.items.children = [children[0]];
    cloned.summary.childCount = 1;
    return cloned;
  }
  return cloned;
}
