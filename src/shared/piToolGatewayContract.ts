export type PiGatewayEffect =
  | "bounded-read"
  | "workspace-mutation"
  | "code-execution"
  | "external-egress"
  | "external-mutation"
  | "local-network"
  | "zotero-mutation"
  | "host-control"
  | "forbidden";
