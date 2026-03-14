export interface PlatformData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MovingPlatformData {
    width: number;
    height: number;
    path: { x: number; y: number }[];
    speed?: number;
}

export interface LevelData {
    name: string;
    worldWidth: number;
    worldHeight: number;
    spawn: { x: number; y: number };
    platforms: PlatformData[];
    movingPlatforms?: MovingPlatformData[];
}

export interface PlatformNode {
    id: number;
    platform: PlatformData;
    isSpawnPlatform: boolean;
}

export type EdgeType = 'fall' | 'standing_jump' | 'running_jump' | 'coyote_jump';

export interface Edge {
    from: number;
    to: number;
    type: EdgeType;
}

export interface Graph {
    nodes: PlatformNode[];
    edges: Edge[];
}

export interface LintReport {
    levelName: string;
    isCompletable: boolean;
    totalPlatforms: number;
    reachablePlatforms: number;
    unreachable: PlatformData[];
    spawnPlatformFound: boolean;
}
