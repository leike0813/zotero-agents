import type { PiGatewayEffect } from "./piToolGatewayContract";

export type PiMcpToolReview = {
  digest: string;
  promoted: boolean;
  effects?: PiGatewayEffect[];
};
export type PiMcpSource = {
  id: string;
  label: string;
  transport: "http" | "stdio";
  url?: string;
  executable?: string;
  argv?: string[];
  cwd?: string;
  enabled: boolean;
  credentialSlots: Record<string, string>;
  selectedTools: Record<string, PiMcpToolReview>;
  cleartextApproval?: string;
  localNetworkApproval?: string;
};
