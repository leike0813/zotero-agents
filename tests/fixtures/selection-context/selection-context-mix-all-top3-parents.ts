import mixAll from "./selection-context-mix-all.json";

const top3ParentsFixture = {
  ...mixAll,
  items: {
    ...mixAll.items,
    parents: mixAll.items.parents.slice(0, 3),
    notes: [],
  },
  summary: {
    ...mixAll.summary,
    parentCount: 3,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],
};

export default top3ParentsFixture;
