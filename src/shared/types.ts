export interface PlatformData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PathPoint {
    x: number;
    y: number;
}

export interface MovingPlatformData {
    width: number;
    height: number;
    path: PathPoint[];
    speed?: number;
}

export interface LevelData {
    name: string;
    worldWidth: number;
    worldHeight: number;
    spawn: { x: number; y: number };
    victory?: { x: number; y: number };
    platforms: PlatformData[];
    movingPlatforms: MovingPlatformData[];
}
