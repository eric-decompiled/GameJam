import { Platform, MovingPlatform, PathPoint } from '../entities/Platform';
import { Entity } from '../entities/Entity';

interface PlatformData {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface MovingPlatformData {
    width: number;
    height: number;
    path: PathPoint[];
    speed?: number;
}

interface MonsterData {
    x: number;
    y: number;
}

interface CoinData {
    x: number;
    y: number;
}

interface LevelData {
    name: string;
    worldWidth: number;
    worldHeight: number;
    spawn: { x: number; y: number };
    victory?: { x: number; y: number };
    platforms: PlatformData[];
    movingPlatforms: MovingPlatformData[];
    monsters?: MonsterData[];
    coins?: CoinData[];
}

export class LevelManager {
    private currentLevel: LevelData | null = null;
    private entities: Entity[] = [];

    async loadLevel(levelName: string): Promise<void> {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}levels/${levelName}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load level: ${levelName}`);
            }
            this.currentLevel = await response.json();
            this.buildLevel();
        } catch (error) {
            console.error('Level loading error:', error);
            this.loadDefaultLevel();
        }
    }

    loadFromJSON(json: string): void {
        try {
            this.currentLevel = JSON.parse(json);
            this.buildLevel();
        } catch (error) {
            console.error('Failed to parse level JSON:', error);
            this.loadDefaultLevel();
        }
    }

    private loadDefaultLevel(): void {
        this.currentLevel = {
            name: 'Default Level',
            worldWidth: 1600,
            worldHeight: 800,
            spawn: { x: 100, y: 500 },
            platforms: [
                { x: 0, y: 700, width: 1600, height: 100 },
                { x: 200, y: 550, width: 150, height: 32 },
                { x: 450, y: 450, width: 150, height: 32 },
                { x: 700, y: 350, width: 150, height: 32 }
            ],
            movingPlatforms: []
        };
        this.buildLevel();
    }

    private buildLevel(): void {
        this.entities = [];

        if (!this.currentLevel) return;

        if (this.currentLevel.platforms) {
            for (const p of this.currentLevel.platforms) {
                const platform = new Platform(p.x, p.y, p.width, p.height);
                this.entities.push(platform);
            }
        }

        if (this.currentLevel.movingPlatforms) {
            for (const mp of this.currentLevel.movingPlatforms) {
                const platform = new MovingPlatform(
                    mp.path[0].x,
                    mp.path[0].y,
                    mp.width,
                    mp.height,
                    mp.path,
                    mp.speed || 100
                );
                this.entities.push(platform);
            }
        }
    }

    getEntities(): Entity[] {
        return [...this.entities];
    }

    getSpawnPoint(): { x: number; y: number } {
        if (this.currentLevel && this.currentLevel.spawn) {
            return { ...this.currentLevel.spawn };
        }
        return { x: 100, y: 500 };
    }

    getVictoryPoint(): { x: number; y: number } | null {
        if (this.currentLevel && this.currentLevel.victory) {
            return { ...this.currentLevel.victory };
        }
        return null;
    }

    getWorldBounds(): { width: number; height: number } {
        if (this.currentLevel) {
            return {
                width: this.currentLevel.worldWidth || 800,
                height: this.currentLevel.worldHeight || 600
            };
        }
        return { width: 800, height: 600 };
    }

    getMonsters(): MonsterData[] {
        return this.currentLevel?.monsters || [];
    }

    getCoins(): CoinData[] {
        return this.currentLevel?.coins || [];
    }
}
