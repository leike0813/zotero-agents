export type CiGateName = "pr" | "release";

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
    id: "test-node-synthesis-sidecar-stage1",
    script: "test:node:synthesis-sidecar:stage1",
  },
];

export function getCiGateStages(gate: CiGateName): CiGateStage[] {
  return [
    ...SHARED_GATE_STAGES,
    {
      id: gate === "release" ? "test-zotero-full" : "test-zotero-lite",
      script: gate === "release" ? "test:full" : "test:lite",
    },
  ];
}
