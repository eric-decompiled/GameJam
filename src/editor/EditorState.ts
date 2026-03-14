import { LevelData, PlatformData, MovingPlatformData, LadderData } from '../shared/types';

const STORAGE_KEY = 'editorLevel';

export type SelectionType = 'platform' | 'movingPlatform' | 'ladder' | 'spawn' | 'victory' | null;

export interface Selection {
    type: SelectionType;
    index: number | null;
}

export type EditorEventType = 'change' | 'selectionChange';

export class EditorState {
    private level: LevelData;
    private selection: Selection = { type: null, index: null };
    private listeners: Map<EditorEventType, Set<() => void>> = new Map();
    private history: string[] = [];
    private maxHistory: number = 50;

    constructor() {
        this.level = this.loadFromStorage() || this.createDefaultLevel();
        this.pushHistory();
    }

    private pushHistory(): void {
        const snapshot = JSON.stringify(this.level);
        // Don't push if identical to last state
        if (this.history.length > 0 && this.history[this.history.length - 1] === snapshot) {
            return;
        }
        this.history.push(snapshot);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    undo(): boolean {
        if (this.history.length <= 1) return false;

        // Remove current state
        this.history.pop();
        // Restore previous state
        const previous = this.history[this.history.length - 1];
        if (previous) {
            this.level = JSON.parse(previous);
            this.clearSelection();
            this.saveToStorage();
            this.listeners.get('change')?.forEach(cb => cb());
            return true;
        }
        return false;
    }

    private loadFromStorage(): LevelData | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved) as LevelData;
                if (data.platforms && data.spawn && typeof data.worldWidth === 'number') {
                    return data;
                }
            }
        } catch {
            // Invalid data, ignore
        }
        return null;
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.level));
        } catch {
            // Storage full or unavailable
        }
    }

    private createDefaultLevel(): LevelData {
        return {
            name: 'New Level',
            worldWidth: 2000,
            worldHeight: 800,
            spawn: { x: 100, y: 600 },
            victory: { x: 1800, y: 600 },
            platforms: [
                { x: 0, y: 700, width: 400, height: 100 }
            ],
            movingPlatforms: [],
            ladders: []
        };
    }

    getLevel(): LevelData {
        return this.level;
    }

    setLevel(level: LevelData): void {
        this.level = level;
        this.clearSelection();
        this.emit('change');
    }

    getSelection(): Selection {
        return this.selection;
    }

    getSelectedPlatform(): PlatformData | null {
        if (this.selection.type === 'platform' && this.selection.index !== null) {
            return this.level.platforms[this.selection.index] || null;
        }
        return null;
    }

    getSelectedMovingPlatform(): MovingPlatformData | null {
        if (this.selection.type === 'movingPlatform' && this.selection.index !== null) {
            return this.level.movingPlatforms[this.selection.index] || null;
        }
        return null;
    }

    getSelectedLadder(): LadderData | null {
        if (this.selection.type === 'ladder' && this.selection.index !== null) {
            return this.level.ladders?.[this.selection.index] || null;
        }
        return null;
    }

    selectPlatform(index: number): void {
        this.selection = { type: 'platform', index };
        this.emit('selectionChange');
    }

    selectMovingPlatform(index: number): void {
        this.selection = { type: 'movingPlatform', index };
        this.emit('selectionChange');
    }

    selectLadder(index: number): void {
        this.selection = { type: 'ladder', index };
        this.emit('selectionChange');
    }

    selectSpawn(): void {
        this.selection = { type: 'spawn', index: null };
        this.emit('selectionChange');
    }

    selectVictory(): void {
        this.selection = { type: 'victory', index: null };
        this.emit('selectionChange');
    }

    clearSelection(): void {
        this.selection = { type: null, index: null };
        this.emit('selectionChange');
    }

    addPlatform(platform: PlatformData): number {
        this.level.platforms.push(platform);
        const index = this.level.platforms.length - 1;
        this.emit('change');
        return index;
    }

    updatePlatform(index: number, updates: Partial<PlatformData>): void {
        if (index >= 0 && index < this.level.platforms.length) {
            Object.assign(this.level.platforms[index], updates);
            this.emit('change');
        }
    }

    deletePlatform(index: number): void {
        if (index >= 0 && index < this.level.platforms.length) {
            this.level.platforms.splice(index, 1);
            if (this.selection.type === 'platform') {
                if (this.selection.index === index) {
                    this.clearSelection();
                } else if (this.selection.index !== null && this.selection.index > index) {
                    this.selection.index--;
                }
            }
            this.emit('change');
        }
    }

    addMovingPlatform(platform: MovingPlatformData): number {
        this.level.movingPlatforms.push(platform);
        const index = this.level.movingPlatforms.length - 1;
        this.emit('change');
        return index;
    }

    updateMovingPlatform(index: number, updates: Partial<MovingPlatformData>): void {
        if (index >= 0 && index < this.level.movingPlatforms.length) {
            Object.assign(this.level.movingPlatforms[index], updates);
            this.emit('change');
        }
    }

    deleteMovingPlatform(index: number): void {
        if (index >= 0 && index < this.level.movingPlatforms.length) {
            this.level.movingPlatforms.splice(index, 1);
            if (this.selection.type === 'movingPlatform') {
                if (this.selection.index === index) {
                    this.clearSelection();
                } else if (this.selection.index !== null && this.selection.index > index) {
                    this.selection.index--;
                }
            }
            this.emit('change');
        }
    }

    addLadder(ladder: LadderData): number {
        if (!this.level.ladders) {
            this.level.ladders = [];
        }
        this.level.ladders.push(ladder);
        const index = this.level.ladders.length - 1;
        this.emit('change');
        return index;
    }

    updateLadder(index: number, updates: Partial<LadderData>): void {
        if (this.level.ladders && index >= 0 && index < this.level.ladders.length) {
            Object.assign(this.level.ladders[index], updates);
            this.emit('change');
        }
    }

    deleteLadder(index: number): void {
        if (this.level.ladders && index >= 0 && index < this.level.ladders.length) {
            this.level.ladders.splice(index, 1);
            if (this.selection.type === 'ladder') {
                if (this.selection.index === index) {
                    this.clearSelection();
                } else if (this.selection.index !== null && this.selection.index > index) {
                    this.selection.index--;
                }
            }
            this.emit('change');
        }
    }

    setSpawn(x: number, y: number): void {
        this.level.spawn = { x, y };
        this.emit('change');
    }

    setVictory(x: number, y: number): void {
        this.level.victory = { x, y };
        this.emit('change');
    }

    updateLevelInfo(updates: Partial<Pick<LevelData, 'name' | 'worldWidth' | 'worldHeight'>>): void {
        Object.assign(this.level, updates);
        this.emit('change');
    }

    newLevel(): void {
        this.level = this.createDefaultLevel();
        this.clearSelection();
        this.emit('change');
    }

    reset(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.level = this.createDefaultLevel();
        this.clearSelection();
        this.emit('change');
    }

    exportJSON(): string {
        return JSON.stringify(this.level, null, 2);
    }

    importJSON(json: string): boolean {
        try {
            const data = JSON.parse(json) as LevelData;
            if (!data.platforms || !data.spawn || typeof data.worldWidth !== 'number') {
                throw new Error('Invalid level format');
            }
            this.setLevel(data);
            return true;
        } catch {
            return false;
        }
    }

    on(event: EditorEventType, callback: () => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: EditorEventType, callback: () => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: EditorEventType): void {
        if (event === 'change') {
            this.pushHistory();
            this.saveToStorage();
        }
        this.listeners.get(event)?.forEach(cb => cb());
    }

    getPlatformAt(worldX: number, worldY: number): number | null {
        for (let i = this.level.platforms.length - 1; i >= 0; i--) {
            const p = this.level.platforms[i];
            if (worldX >= p.x && worldX <= p.x + p.width &&
                worldY >= p.y && worldY <= p.y + p.height) {
                return i;
            }
        }
        return null;
    }

    getMovingPlatformAt(worldX: number, worldY: number): number | null {
        for (let i = this.level.movingPlatforms.length - 1; i >= 0; i--) {
            const mp = this.level.movingPlatforms[i];
            // Check at start position
            const startX = mp.path[0].x;
            const startY = mp.path[0].y;
            if (worldX >= startX && worldX <= startX + mp.width &&
                worldY >= startY && worldY <= startY + mp.height) {
                return i;
            }
            // Check at end position
            if (mp.path.length > 1) {
                const endX = mp.path[1].x;
                const endY = mp.path[1].y;
                if (worldX >= endX && worldX <= endX + mp.width &&
                    worldY >= endY && worldY <= endY + mp.height) {
                    return i;
                }
            }
        }
        return null;
    }

    getLadderAt(worldX: number, worldY: number): number | null {
        if (!this.level.ladders) return null;
        const ladderWidth = 32; // Visual width of ladder
        for (let i = this.level.ladders.length - 1; i >= 0; i--) {
            const ladder = this.level.ladders[i];
            if (worldX >= ladder.x && worldX <= ladder.x + ladderWidth &&
                worldY >= ladder.y && worldY <= ladder.y + ladder.height) {
                return i;
            }
        }
        return null;
    }

    isSpawnAt(worldX: number, worldY: number): boolean {
        const spawnSize = 32;
        const spawn = this.level.spawn;
        return worldX >= spawn.x - spawnSize / 2 && worldX <= spawn.x + spawnSize / 2 &&
               worldY >= spawn.y - spawnSize && worldY <= spawn.y;
    }

    isVictoryAt(worldX: number, worldY: number): boolean {
        if (!this.level.victory) return false;
        const size = 32;
        const victory = this.level.victory;
        return worldX >= victory.x - size / 2 && worldX <= victory.x + size / 2 &&
               worldY >= victory.y - size && worldY <= victory.y;
    }
}
