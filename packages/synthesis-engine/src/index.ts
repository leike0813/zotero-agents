import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

export const SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX = 5000 as const;
export const SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX = 20000 as const;
export const SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION = 1.2 as const;

const IDENTIFIER_MAX = 512;
const TEXT_MAX = 4096;

export type SynthesisCitationGraphLayoutAlgorithm =
  | "force"
  | "radial"
  | "components";

export type SynthesisCitationGraphLayoutNodeKind =
  | "library_paper"
  | "external_reference"
  | "unresolved_reference";

export type SynthesisCitationGraphLayoutRequestNode = {
  nodeId: string;
  kind: SynthesisCitationGraphLayoutNodeKind;
  title?: string;
  year?: string;
  initialX: number;
  initialY: number;
};

export type SynthesisCitationGraphLayoutRequestEdge = {
  edgeId: string;
  source: string;
  target: string;
};

export type SynthesisCitationGraphLayoutRequest = {
  graphHash: string;
  algorithm: SynthesisCitationGraphLayoutAlgorithm;
  nodes: SynthesisCitationGraphLayoutRequestNode[];
  edges: SynthesisCitationGraphLayoutRequestEdge[];
};

export type SynthesisCitationGraphLayoutResultNode = {
  nodeId: string;
  x: number;
  y: number;
};

export type SynthesisCitationGraphLayoutResult = {
  graphHash: string;
  algorithm: SynthesisCitationGraphLayoutAlgorithm;
  layoutEngine: "d3-force" | "radial" | "components";
  layoutVersion: typeof SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION;
  params: Record<string, number | string>;
  nodes: SynthesisCitationGraphLayoutResultNode[];
};

export interface SynthesisCitationGraphLayoutEngine {
  compute(
    request: SynthesisCitationGraphLayoutRequest,
  ): Promise<SynthesisCitationGraphLayoutResult>;
}

export type SynthesisCitationGraphLayoutCheckpoint = (checkpoint: {
  algorithm: SynthesisCitationGraphLayoutAlgorithm;
  phase: "start" | "iteration" | "complete";
  iteration?: number;
}) => void;

export class SynthesisCitationGraphLayoutContractError extends Error {
  readonly code = "invalid_request";

  constructor(message: string) {
    super(message);
    this.name = "SynthesisCitationGraphLayoutContractError";
  }
}

const FORCE_LAYOUT_PARAMS = {
  link_distance: 180,
  charge: -520,
  collision_radius: 24,
  iterations: 700,
  isolated_radius: 72,
  isolated_gap: 96,
};

const RADIAL_LAYOUT_PARAMS = {
  library_radius_step: 82,
  external_offset: 76,
  fallback_radius_step: 64,
  golden_angle: 2.399963229728653,
};

const COMPONENT_LAYOUT_PARAMS = {
  component_gap: 360,
  node_gap: 54,
  golden_angle: 2.399963229728653,
};

function invalid(message: string): never {
  throw new SynthesisCitationGraphLayoutContractError(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonSafe(
  value: unknown,
  location: string,
  seen = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalid(`${location} must contain finite numbers`);
    }
    return;
  }
  if (typeof value !== "object" || value === undefined) {
    invalid(`${location} must be JSON-safe`);
  }
  const object = value as object;
  if (seen.has(object)) {
    invalid(`${location} must not contain cycles`);
  }
  seen.add(object);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonSafe(entry, `${location}[${index}]`, seen),
    );
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${location}.${key}`, seen);
    }
  } else {
    invalid(`${location} must contain plain objects`);
  }
  seen.delete(object);
}

function jsonObject(value: unknown, location: string) {
  assertJsonSafe(value, location);
  if (!isPlainObject(value)) {
    return invalid(`${location} must be an object`);
  }
  return value;
}

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function requiredString(value: unknown, location: string, max = TEXT_MAX) {
  if (typeof value !== "string") {
    return invalid(`${location} must be a string`);
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized !== value ||
    normalized.length > max ||
    hasControlCharacter(normalized)
  ) {
    return invalid(`${location} is invalid`);
  }
  return normalized;
}

function optionalString(value: unknown, location: string) {
  if (value === undefined) {
    return undefined;
  }
  return requiredString(value, location);
}

function rebuildAlgorithm(
  value: unknown,
): SynthesisCitationGraphLayoutAlgorithm {
  if (value === "force" || value === "radial" || value === "components") {
    return value;
  }
  return invalid("algorithm is invalid");
}

function rebuildNodeKind(value: unknown): SynthesisCitationGraphLayoutNodeKind {
  if (
    value === "library_paper" ||
    value === "external_reference" ||
    value === "unresolved_reference"
  ) {
    return value;
  }
  return invalid("node kind is invalid");
}

function rebuildGraphHash(value: unknown) {
  const graphHash = requiredString(value, "graphHash", 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(graphHash)) {
    return invalid("graphHash is invalid");
  }
  return graphHash;
}

function expectedMetadata(algorithm: SynthesisCitationGraphLayoutAlgorithm) {
  if (algorithm === "radial") {
    return {
      layoutEngine: "radial" as const,
      params: RADIAL_LAYOUT_PARAMS,
    };
  }
  if (algorithm === "components") {
    return {
      layoutEngine: "components" as const,
      params: COMPONENT_LAYOUT_PARAMS,
    };
  }
  return {
    layoutEngine: "d3-force" as const,
    params: FORCE_LAYOUT_PARAMS,
  };
}

function rebuildParams(
  value: unknown,
  algorithm: SynthesisCitationGraphLayoutAlgorithm,
) {
  const params = jsonObject(value, "result.params");
  const expected = expectedMetadata(algorithm).params;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (params[key] !== expectedValue) {
      return invalid(`result.params.${key} is invalid`);
    }
  }
  return { ...expected };
}

export function rebuildSynthesisCitationGraphLayoutRequest(
  value: unknown,
): SynthesisCitationGraphLayoutRequest {
  const request = jsonObject(value, "request");
  const graphHash = rebuildGraphHash(request.graphHash);
  const algorithm = rebuildAlgorithm(request.algorithm);
  if (
    !Array.isArray(request.nodes) ||
    request.nodes.length < 1 ||
    request.nodes.length > SYNTHESIS_CITATION_GRAPH_LAYOUT_NODE_MAX
  ) {
    return invalid("request.nodes is outside the supported bounds");
  }
  if (
    !Array.isArray(request.edges) ||
    request.edges.length > SYNTHESIS_CITATION_GRAPH_LAYOUT_EDGE_MAX
  ) {
    return invalid("request.edges is outside the supported bounds");
  }
  const nodeIds = new Set<string>();
  const nodes = request.nodes.map((value, index) => {
    const node = jsonObject(value, `request.nodes[${index}]`);
    const nodeId = requiredString(
      node.nodeId,
      `request.nodes[${index}].nodeId`,
      IDENTIFIER_MAX,
    );
    if (nodeIds.has(nodeId)) {
      return invalid("request node identifiers must be unique");
    }
    nodeIds.add(nodeId);
    const rebuilt: SynthesisCitationGraphLayoutRequestNode = {
      nodeId,
      kind: rebuildNodeKind(node.kind),
      initialX:
        typeof node.initialX === "number" && Number.isFinite(node.initialX)
          ? node.initialX
          : invalid(`request.nodes[${index}].initialX is invalid`),
      initialY:
        typeof node.initialY === "number" && Number.isFinite(node.initialY)
          ? node.initialY
          : invalid(`request.nodes[${index}].initialY is invalid`),
    };
    const title = optionalString(node.title, `request.nodes[${index}].title`);
    const year = optionalString(node.year, `request.nodes[${index}].year`);
    if (title !== undefined) {
      rebuilt.title = title;
    }
    if (year !== undefined) {
      rebuilt.year = year;
    }
    return rebuilt;
  });
  const edgeIds = new Set<string>();
  const edges = request.edges.map((value, index) => {
    const edge = jsonObject(value, `request.edges[${index}]`);
    const edgeId = requiredString(
      edge.edgeId,
      `request.edges[${index}].edgeId`,
      IDENTIFIER_MAX,
    );
    if (edgeIds.has(edgeId)) {
      return invalid("request edge identifiers must be unique");
    }
    edgeIds.add(edgeId);
    const source = requiredString(
      edge.source,
      `request.edges[${index}].source`,
      IDENTIFIER_MAX,
    );
    const target = requiredString(
      edge.target,
      `request.edges[${index}].target`,
      IDENTIFIER_MAX,
    );
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      return invalid("request edge endpoints must reference request nodes");
    }
    return { edgeId, source, target };
  });
  nodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  edges.sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  return { graphHash, algorithm, nodes, edges };
}

export function rebuildSynthesisCitationGraphLayoutResult(
  value: unknown,
  requestInput: SynthesisCitationGraphLayoutRequest,
): SynthesisCitationGraphLayoutResult {
  const request = rebuildSynthesisCitationGraphLayoutRequest(requestInput);
  const result = jsonObject(value, "result");
  const graphHash = rebuildGraphHash(result.graphHash);
  const algorithm = rebuildAlgorithm(result.algorithm);
  if (graphHash !== request.graphHash || algorithm !== request.algorithm) {
    return invalid("result basis does not match the request");
  }
  const expected = expectedMetadata(algorithm);
  if (
    result.layoutEngine !== expected.layoutEngine ||
    result.layoutVersion !== SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION
  ) {
    return invalid("result layout metadata is invalid");
  }
  const params = rebuildParams(result.params, algorithm);
  if (!Array.isArray(result.nodes)) {
    return invalid("result.nodes must be an array");
  }
  const expectedNodeIds = new Set(request.nodes.map((node) => node.nodeId));
  const resultNodeIds = new Set<string>();
  const nodes = result.nodes.map((value, index) => {
    const node = jsonObject(value, `result.nodes[${index}]`);
    const nodeId = requiredString(
      node.nodeId,
      `result.nodes[${index}].nodeId`,
      IDENTIFIER_MAX,
    );
    if (resultNodeIds.has(nodeId) || !expectedNodeIds.has(nodeId)) {
      return invalid("result node identifiers are invalid");
    }
    if (
      typeof node.x !== "number" ||
      !Number.isFinite(node.x) ||
      typeof node.y !== "number" ||
      !Number.isFinite(node.y)
    ) {
      return invalid("result coordinates must be finite numbers");
    }
    resultNodeIds.add(nodeId);
    return {
      nodeId,
      x: Object.is(node.x, -0) ? 0 : node.x,
      y: Object.is(node.y, -0) ? 0 : node.y,
    };
  });
  if (
    resultNodeIds.size !== expectedNodeIds.size ||
    [...expectedNodeIds].some((nodeId) => !resultNodeIds.has(nodeId))
  ) {
    return invalid("result node set does not match the request");
  }
  nodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  return {
    graphHash,
    algorithm,
    layoutEngine: expected.layoutEngine,
    layoutVersion: SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION,
    params,
    nodes,
  };
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}

function coordinateOnSpiral(
  index: number,
  radiusStep: number,
  angleStep: number,
) {
  if (index <= 0) {
    return { x: 0, y: 0 };
  }
  const angle = index * angleStep;
  const radius = radiusStep * Math.sqrt(index);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function roundedCoordinates(nodes: Record<string, { x: number; y: number }>) {
  return Object.fromEntries(
    Object.entries(nodes)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([nodeId, point]) => [
        nodeId,
        { x: roundCoordinate(point.x), y: roundCoordinate(point.y) },
      ]),
  );
}

function degreeMaps(request: SynthesisCitationGraphLayoutRequest) {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const edge of request.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) || 0) + 1);
  }
  return { incoming, outgoing };
}

function compareNodeImportance(
  incoming: Map<string, number>,
  outgoing: Map<string, number>,
) {
  return (
    left: SynthesisCitationGraphLayoutRequestNode,
    right: SynthesisCitationGraphLayoutRequestNode,
  ) => {
    const leftIncoming = incoming.get(left.nodeId) || 0;
    const rightIncoming = incoming.get(right.nodeId) || 0;
    const leftOutgoing = outgoing.get(left.nodeId) || 0;
    const rightOutgoing = outgoing.get(right.nodeId) || 0;
    const leftYear = Number(left.year) || Number.POSITIVE_INFINITY;
    const rightYear = Number(right.year) || Number.POSITIVE_INFINITY;
    const leftTitle = normalizeText(left.title || left.nodeId).toLowerCase();
    const rightTitle = normalizeText(right.title || right.nodeId).toLowerCase();
    return (
      rightIncoming - leftIncoming ||
      rightOutgoing - leftOutgoing ||
      leftYear - rightYear ||
      leftTitle.localeCompare(rightTitle) ||
      left.nodeId.localeCompare(right.nodeId)
    );
  };
}

function result(
  request: SynthesisCitationGraphLayoutRequest,
  nodes: Record<string, { x: number; y: number }>,
) {
  const metadata = expectedMetadata(request.algorithm);
  return rebuildSynthesisCitationGraphLayoutResult(
    {
      graphHash: request.graphHash,
      algorithm: request.algorithm,
      layoutEngine: metadata.layoutEngine,
      layoutVersion: SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION,
      params: metadata.params,
      nodes: Object.entries(nodes).map(([nodeId, point]) => ({
        nodeId,
        x: point.x,
        y: point.y,
      })),
    },
    request,
  );
}

type ForceNode = SimulationNodeDatum & { id: string };
type ForceLink = SimulationLinkDatum<ForceNode>;

function computeForce(
  request: SynthesisCitationGraphLayoutRequest,
  checkpoint?: SynthesisCitationGraphLayoutCheckpoint,
) {
  const connectedNodeIds = new Set<string>();
  for (const edge of request.edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }
  const connectedNodes = request.nodes.filter((node) =>
    connectedNodeIds.has(node.nodeId),
  );
  const isolatedNodes = request.nodes.filter(
    (node) => !connectedNodeIds.has(node.nodeId),
  );
  const simulationNodes: ForceNode[] = connectedNodes.map((node) => ({
    id: node.nodeId,
    x: node.initialX,
    y: node.initialY,
  }));
  const links: ForceLink[] = request.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));
  const simulation = forceSimulation(simulationNodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(links)
        .id((node) => node.id)
        .distance(FORCE_LAYOUT_PARAMS.link_distance),
    )
    .force("charge", forceManyBody().strength(FORCE_LAYOUT_PARAMS.charge))
    .force("collide", forceCollide(FORCE_LAYOUT_PARAMS.collision_radius))
    .force("center", forceCenter(0, 0))
    .stop();
  for (
    let iteration = 0;
    iteration < FORCE_LAYOUT_PARAMS.iterations;
    iteration += 1
  ) {
    simulation.tick();
    checkpoint?.({ algorithm: "force", phase: "iteration", iteration });
  }
  const coordinates: Record<string, { x: number; y: number }> = {};
  const connectedCoordinates: Array<{ x: number; y: number }> = [];
  for (const node of simulationNodes.sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    connectedCoordinates.push({
      x: Number(node.x || 0),
      y: Number(node.y || 0),
    });
    coordinates[node.id] = {
      x: roundCoordinate(Number(node.x || 0)),
      y: roundCoordinate(Number(node.y || 0)),
    };
  }
  if (isolatedNodes.length) {
    const maxX = connectedCoordinates.length
      ? Math.max(...connectedCoordinates.map((point) => point.x))
      : 0;
    const minY = connectedCoordinates.length
      ? Math.min(...connectedCoordinates.map((point) => point.y))
      : 0;
    const center = {
      x:
        maxX +
        FORCE_LAYOUT_PARAMS.isolated_radius +
        FORCE_LAYOUT_PARAMS.isolated_gap,
      y: minY,
    };
    isolatedNodes.forEach((node, index) => {
      const offset = coordinateOnSpiral(
        index,
        FORCE_LAYOUT_PARAMS.isolated_radius,
        RADIAL_LAYOUT_PARAMS.golden_angle,
      );
      coordinates[node.nodeId] = {
        x: roundCoordinate(center.x + offset.x),
        y: roundCoordinate(center.y + offset.y),
      };
    });
  }
  return result(request, coordinates);
}

function computeRadial(request: SynthesisCitationGraphLayoutRequest) {
  const { incoming, outgoing } = degreeMaps(request);
  const libraryNodes = request.nodes
    .filter((node) => node.kind === "library_paper")
    .sort(compareNodeImportance(incoming, outgoing));
  const nonLibraryNodes = request.nodes
    .filter((node) => node.kind !== "library_paper")
    .sort(compareNodeImportance(incoming, outgoing));
  const coordinates: Record<string, { x: number; y: number }> = {};
  libraryNodes.forEach((node, index) => {
    coordinates[node.nodeId] = coordinateOnSpiral(
      index,
      RADIAL_LAYOUT_PARAMS.library_radius_step,
      RADIAL_LAYOUT_PARAMS.golden_angle,
    );
  });
  const inboundSourcesByTarget = new Map<string, string[]>();
  for (const edge of request.edges) {
    if (!inboundSourcesByTarget.has(edge.target)) {
      inboundSourcesByTarget.set(edge.target, []);
    }
    inboundSourcesByTarget.get(edge.target)?.push(edge.source);
  }
  nonLibraryNodes.forEach((node, index) => {
    const sourcePoints = (inboundSourcesByTarget.get(node.nodeId) || [])
      .map((source) => coordinates[source])
      .filter(Boolean);
    if (!sourcePoints.length) {
      coordinates[node.nodeId] = coordinateOnSpiral(
        libraryNodes.length + index + 1,
        RADIAL_LAYOUT_PARAMS.fallback_radius_step,
        RADIAL_LAYOUT_PARAMS.golden_angle,
      );
      return;
    }
    const centroid = sourcePoints.reduce(
      (acc, point) => ({
        x: acc.x + point.x / sourcePoints.length,
        y: acc.y + point.y / sourcePoints.length,
      }),
      { x: 0, y: 0 },
    );
    const seedAngle =
      Math.atan2(centroid.y, centroid.x) ||
      (index + 1) * RADIAL_LAYOUT_PARAMS.golden_angle;
    const offset =
      RADIAL_LAYOUT_PARAMS.external_offset +
      Math.sqrt(index + 1) * (RADIAL_LAYOUT_PARAMS.external_offset / 3);
    coordinates[node.nodeId] = {
      x: centroid.x + Math.cos(seedAngle) * offset,
      y: centroid.y + Math.sin(seedAngle) * offset,
    };
  });
  return result(request, roundedCoordinates(coordinates));
}

function computeComponents(request: SynthesisCitationGraphLayoutRequest) {
  const { incoming, outgoing } = degreeMaps(request);
  const nodesById = new Map(request.nodes.map((node) => [node.nodeId, node]));
  const adjacency = new Map<string, Set<string>>();
  for (const node of request.nodes) {
    adjacency.set(node.nodeId, new Set());
  }
  for (const edge of request.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }
  const visited = new Set<string>();
  const components: SynthesisCitationGraphLayoutRequestNode[][] = [];
  for (const node of request.nodes) {
    if (visited.has(node.nodeId)) {
      continue;
    }
    const queue = [node.nodeId];
    visited.add(node.nodeId);
    const component: SynthesisCitationGraphLayoutRequestNode[] = [];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const graphNode = nodesById.get(current);
      if (graphNode) {
        component.push(graphNode);
      }
      for (const next of adjacency.get(current) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    components.push(component);
  }
  components.sort(
    (left, right) =>
      right.length - left.length ||
      left[0]?.nodeId.localeCompare(right[0]?.nodeId || "") ||
      0,
  );
  const columns = Math.max(1, Math.ceil(Math.sqrt(components.length || 1)));
  const coordinates: Record<string, { x: number; y: number }> = {};
  components.forEach((component, componentIndex) => {
    const column = componentIndex % columns;
    const row = Math.floor(componentIndex / columns);
    const center = {
      x:
        (column - (Math.min(columns, components.length) - 1) / 2) *
        COMPONENT_LAYOUT_PARAMS.component_gap,
      y: row * COMPONENT_LAYOUT_PARAMS.component_gap,
    };
    const ordered = component.sort(compareNodeImportance(incoming, outgoing));
    ordered.forEach((node, index) => {
      const offset = coordinateOnSpiral(
        index,
        COMPONENT_LAYOUT_PARAMS.node_gap,
        COMPONENT_LAYOUT_PARAMS.golden_angle,
      );
      coordinates[node.nodeId] = {
        x: center.x + offset.x,
        y: center.y + offset.y,
      };
    });
  });
  return result(request, roundedCoordinates(coordinates));
}

export function computeSynthesisCitationGraphLayout(
  requestInput: SynthesisCitationGraphLayoutRequest,
  options: { checkpoint?: SynthesisCitationGraphLayoutCheckpoint } = {},
) {
  const request = rebuildSynthesisCitationGraphLayoutRequest(requestInput);
  options.checkpoint?.({ algorithm: request.algorithm, phase: "start" });
  const computed =
    request.algorithm === "radial"
      ? computeRadial(request)
      : request.algorithm === "components"
        ? computeComponents(request)
        : computeForce(request, options.checkpoint);
  options.checkpoint?.({ algorithm: request.algorithm, phase: "complete" });
  return rebuildSynthesisCitationGraphLayoutResult(computed, request);
}

export function createInProcessSynthesisCitationGraphLayoutEngine(
  options: { checkpoint?: SynthesisCitationGraphLayoutCheckpoint } = {},
): SynthesisCitationGraphLayoutEngine {
  return {
    async compute(request) {
      return computeSynthesisCitationGraphLayout(request, options);
    },
  };
}
