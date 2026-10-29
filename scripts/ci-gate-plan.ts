export type CiGateName = "pr" | "release" | "full" | "workflow";

export type CiGateStage = {
  id: string;
  script: string;
};

const SHARED_GATE_STAGES: readonly CiGateStage[] = [
  {
    id: "check-localization-governance",
    script: "check:localization-governance",
  },
  {
    id: "check-ssot-invariants",
    script: "check:ssot-invariants",
  },
  {
    id: "check-host-bridge-content",
    script: "check:host-bridge-content",
  },
  {
    id: "check-builtin-skill-contracts",
    script: "check:builtin-skill-contracts",
  },
  {
    id: "test-synthesis-native-stage1",
    script: "test:synthesis-native:stage1",
  },
  {
    id: "test-node",
    script: "test:node",
  },
];

export function getCiGateStages(gate: CiGateName): CiGateStage[] {
  if (gate === "workflow")
    return [{ id: "test-workflow-e2e", script: "test:zotero:e2e" }];
  return [
    ...SHARED_GATE_STAGES,
    ...(gate !== "pr"
      ? [
          { id: "test-synthesis-rust", script: "test:synthesis-rust-sidecar" },
          { id: "test-host-bridge-rust", script: "test:host-bridge:rust" },
          { id: "test-acp-bridge-rust", script: "test:acp-ws-bridge:rust" },
        ]
      : []),
    {
      id: gate === "pr" ? "test-zotero-lite" : "test-zotero-full",
      script: gate === "pr" ? "test:lite" : "test:zotero:full",
    },
    ...(gate === "pr"
      ? [{ id: "test-workflow-e2e", script: "test:zotero:e2e:workflow" }]
      : []),
  ];
}
