import { PlatformData, PlatformNode, Edge, Graph } from './types';
import { canReach, findSpawnPlatform } from './physics';

/**
 * Build a reachability graph from platforms.
 * Each platform is a node, edges represent player movement possibilities.
 */
export function buildGraph(platforms: PlatformData[], spawn: { x: number; y: number }): Graph {
    const spawnPlatformId = findSpawnPlatform(platforms, spawn);

    // Create nodes
    const nodes: PlatformNode[] = platforms.map((platform, id) => ({
        id,
        platform,
        isSpawnPlatform: id === spawnPlatformId
    }));

    // Create edges by checking reachability between all platform pairs
    const edges: Edge[] = [];

    for (let i = 0; i < platforms.length; i++) {
        for (let j = 0; j < platforms.length; j++) {
            if (i === j) continue;

            const edge = canReach(platforms[i], platforms[j]);
            if (edge) {
                edges.push({
                    from: i,
                    to: j,
                    type: edge.type
                });
            }
        }
    }

    return { nodes, edges };
}

/**
 * Find all reachable platforms from spawn using BFS.
 * Returns a set of platform IDs that can be reached.
 */
export function findReachable(graph: Graph): Set<number> {
    const spawnNode = graph.nodes.find(n => n.isSpawnPlatform);

    if (!spawnNode) {
        // No spawn platform found, return empty set
        return new Set();
    }

    // BFS from spawn platform
    const visited = new Set<number>();
    const queue: number[] = [spawnNode.id];

    while (queue.length > 0) {
        const current = queue.shift()!;

        if (visited.has(current)) continue;
        visited.add(current);

        // Find all edges from current node
        for (const edge of graph.edges) {
            if (edge.from === current && !visited.has(edge.to)) {
                queue.push(edge.to);
            }
        }
    }

    return visited;
}

/**
 * Get unreachable platforms
 */
export function getUnreachablePlatforms(graph: Graph, reachable: Set<number>): PlatformData[] {
    return graph.nodes
        .filter(node => !reachable.has(node.id))
        .map(node => node.platform);
}
