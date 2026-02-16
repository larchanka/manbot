/**
 * DAG validation for capability graphs.
 * Ensures acyclic graph, valid dependsOn references, and at least one start node.
 */

export interface CapabilityNode {
  id: string;
  type: string;
  service: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
  timeoutMs?: number;
  retryPolicy?: { maxRetries: number; backoffMs: number };
}

export interface CapabilityEdge {
  from: string;
  to: string;
}

export interface CapabilityGraph {
  taskId?: string;
  complexity?: string;
  reflectionMode?: string;
  nodes: CapabilityNode[];
  edges?: CapabilityEdge[];
}

export interface ValidateGraphResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a capability graph as a DAG.
 * - No cycles
 * - Every dependsOn reference points to a node in the graph
 * - At least one start node (no incoming edges / no dependencies)
 */
export function validateGraph(dag: CapabilityGraph): ValidateGraphResult {
  const errors: string[] = [];
  const nodeIds = new Set(dag.nodes.map((n) => n.id));

  // Orphaned dependency references
  for (const node of dag.nodes) {
    const deps = node.input?.dependsOn as string[] | undefined;
    if (Array.isArray(deps)) {
      for (const ref of deps) {
        if (!nodeIds.has(ref)) {
          errors.push(`Node "${node.id}" dependsOn unknown node "${ref}"`);
        }
      }
    }
  }

  // Build adjacency and in-degree from nodes (dependsOn) and edges
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of dag.nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const n of dag.nodes) {
    const deps = (n.input?.dependsOn as string[] | undefined) ?? [];
    for (const dep of deps) {
      if (nodeIds.has(dep)) {
        adj.get(dep)?.push(n.id);
        inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1);
      }
    }
  }
  if (dag.edges) {
    for (const e of dag.edges) {
      if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
        if (!adj.get(e.from)?.includes(e.to)) {
          adj.get(e.from)?.push(e.to);
          inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
        }
      }
    }
  }

  // At least one start node (in-degree 0)
  const startNodes = dag.nodes.filter((n) => inDegree.get(n.id) === 0);
  if (startNodes.length === 0) {
    errors.push("Graph has no start node (every node has dependencies)");
  }

  // Topological sort / cycle detection: Kahn's algorithm
  const queue: string[] = startNodes.map((n) => n.id);
  const sorted: string[] = [];
  const inDegreeCopy = new Map(inDegree);
  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);
    for (const v of adj.get(u) ?? []) {
      const d = (inDegreeCopy.get(v) ?? 1) - 1;
      inDegreeCopy.set(v, d);
      if (d === 0) queue.push(v);
    }
  }
  if (sorted.length !== dag.nodes.length) {
    errors.push("Graph contains a cycle (not a DAG)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Dependencies for each node: node id -> set of node ids it depends on */
export function getDependencyMap(graph: CapabilityGraph): Map<string, Set<string>> {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const deps = new Map<string, Set<string>>();
  for (const n of graph.nodes) {
    const set = new Set<string>();
    const inputDeps = (n.input?.dependsOn as string[] | undefined) ?? [];
    for (const ref of inputDeps) {
      if (nodeIds.has(ref)) set.add(ref);
    }
    if (graph.edges) {
      for (const e of graph.edges) {
        if (e.to === n.id && nodeIds.has(e.from)) set.add(e.from);
      }
    }
    deps.set(n.id, set);
  }
  return deps;
}

/** Return node ids that are ready: all dependencies are in completedIds */
export function getReadyNodes(
  graph: CapabilityGraph,
  dependencyMap: Map<string, Set<string>>,
  completedIds: Set<string>,
): string[] {
  const ready: string[] = [];
  for (const n of graph.nodes) {
    const nodeDeps = dependencyMap.get(n.id);
    if (!nodeDeps || nodeDeps.size === 0) {
      if (!completedIds.has(n.id)) ready.push(n.id);
      continue;
    }
    const allDone = [...nodeDeps].every((d) => completedIds.has(d));
    if (allDone && !completedIds.has(n.id)) ready.push(n.id);
  }
  return ready;
}
