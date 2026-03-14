import { EditorState } from '../EditorState';
import { LevelData } from '../../shared/types';

export class ActionsPanel {
    private container: HTMLElement;
    private state: EditorState;
    private setStatus: (msg: string) => void;

    constructor(container: HTMLElement, state: EditorState, setStatus: (msg: string) => void) {
        this.container = container;
        this.state = state;
        this.setStatus = setStatus;
        this.render();
    }

    private render(): void {
        this.container.innerHTML = `
            <h3>Actions</h3>
            <button class="primary" id="copy-json">Copy to Clipboard</button>
            <button id="paste-json">Paste from Clipboard</button>
            <button id="new-level">New Level</button>
            <button class="danger" id="reset-editor">Reset Editor</button>
            <button id="random-level" style="margin-top: 8px; background: #4a8a4a;">Random Level</button>
            <div style="margin-top: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #a0a0c0;">Load Level</label>
                <select id="load-level">
                    <option value="">Select a level...</option>
                    <option value="level1">Level 1</option>
                </select>
            </div>
        `;

        this.container.querySelector('#copy-json')!.addEventListener('click', async () => {
            try {
                const json = this.state.exportJSON();
                await navigator.clipboard.writeText(json);
                this.setStatus('Level JSON copied to clipboard');
            } catch (err) {
                this.setStatus('Failed to copy to clipboard');
                console.error(err);
            }
        });

        this.container.querySelector('#paste-json')!.addEventListener('click', async () => {
            try {
                const json = await navigator.clipboard.readText();
                if (this.state.importJSON(json)) {
                    this.setStatus('Level loaded from clipboard');
                } else {
                    this.setStatus('Invalid level JSON in clipboard');
                }
            } catch (err) {
                this.setStatus('Failed to read clipboard');
                console.error(err);
            }
        });

        this.container.querySelector('#new-level')!.addEventListener('click', () => {
            if (confirm('Create a new level? Current changes will be lost.')) {
                this.state.newLevel();
                this.setStatus('New level created');
            }
        });

        this.container.querySelector('#reset-editor')!.addEventListener('click', () => {
            if (confirm('Reset editor and clear saved data? This cannot be undone.')) {
                this.state.reset();
                this.setStatus('Editor reset');
            }
        });

        this.container.querySelector('#random-level')!.addEventListener('click', () => {
            const level = this.generateRandomLevel();
            this.state.setLevel(level);
            this.setStatus('Random level generated');
        });

        const loadSelect = this.container.querySelector('#load-level') as HTMLSelectElement;
        loadSelect.addEventListener('change', async () => {
            const levelName = loadSelect.value;
            if (!levelName) return;

            try {
                const response = await fetch(`${import.meta.env.BASE_URL}levels/${levelName}.json`);
                if (!response.ok) throw new Error('Failed to load');
                const data = await response.json();
                this.state.setLevel(data);
                this.setStatus(`Loaded ${levelName}`);
            } catch (err) {
                this.setStatus(`Failed to load ${levelName}`);
                console.error(err);
            }

            loadSelect.value = '';
        });
    }

    private generateRandomLevel(): LevelData {
        // Physics-based jump constraints
        const MAX_JUMP_HEIGHT = 120; // Conservative max vertical jump
        const MAX_JUMP_HORIZONTAL = 180; // Conservative horizontal distance at same level
        const GRID = 32;

        // Random world dimensions
        const worldWidth = this.snapToGrid(1600 + Math.random() * 1200, GRID);
        const worldHeight = 800;

        const platforms: { x: number; y: number; width: number; height: number }[] = [];
        const monsters: { x: number; y: number }[] = [];
        const coins: { x: number; y: number }[] = [];

        // Start platform (spawn area)
        const startPlatform = {
            x: 0,
            y: worldHeight - 100,
            width: this.snapToGrid(200 + Math.random() * 100, GRID),
            height: 100
        };
        platforms.push(startPlatform);

        const spawn = {
            x: startPlatform.x + 64,
            y: startPlatform.y
        };

        // Generate platforms progressively to the right
        let currentX = startPlatform.x + startPlatform.width;
        let currentY = startPlatform.y;
        let platformCount = Math.floor(6 + Math.random() * 8);

        for (let i = 0; i < platformCount && currentX < worldWidth - 300; i++) {
            // Random horizontal gap (must be jumpable)
            const gapX = this.snapToGrid(60 + Math.random() * (MAX_JUMP_HORIZONTAL - 80), GRID);

            // Random vertical offset (can go up or down, but must be jumpable)
            let deltaY = this.snapToGrid((Math.random() - 0.5) * MAX_JUMP_HEIGHT * 1.5, GRID);

            // Ensure platform stays in valid range
            const newY = Math.max(200, Math.min(worldHeight - 150, currentY + deltaY));
            deltaY = newY - currentY;

            // If going up too much, check if it's reachable
            if (deltaY < -MAX_JUMP_HEIGHT) {
                deltaY = -MAX_JUMP_HEIGHT;
            }

            const platformWidth = this.snapToGrid(96 + Math.random() * 200, GRID);
            const platform = {
                x: currentX + gapX,
                y: currentY + deltaY,
                width: platformWidth,
                height: 32
            };

            platforms.push(platform);

            // Add coin on some platforms (40% chance)
            if (Math.random() < 0.4) {
                coins.push({
                    x: platform.x + platform.width / 2,
                    y: platform.y - 24
                });
            }

            // Add monster on wider platforms (30% chance, width >= 160)
            if (platformWidth >= 160 && Math.random() < 0.3) {
                monsters.push({
                    x: platform.x + platform.width / 2,
                    y: platform.y
                });
            }

            currentX = platform.x + platform.width;
            currentY = platform.y;
        }

        // End platform (victory area)
        const endPlatform = {
            x: this.snapToGrid(currentX + 60 + Math.random() * 100, GRID),
            y: this.snapToGrid(Math.max(200, Math.min(worldHeight - 150, currentY + (Math.random() - 0.5) * 80)), GRID),
            width: this.snapToGrid(200 + Math.random() * 100, GRID),
            height: 100
        };

        // Ensure victory platform is reachable
        if (endPlatform.y < currentY - MAX_JUMP_HEIGHT) {
            endPlatform.y = currentY - MAX_JUMP_HEIGHT + 32;
        }

        platforms.push(endPlatform);

        const victory = {
            x: endPlatform.x + endPlatform.width - 64,
            y: endPlatform.y
        };

        // Adjust world width to fit all platforms
        const actualWidth = Math.max(worldWidth, endPlatform.x + endPlatform.width + 100);

        return {
            name: 'Random Level',
            worldWidth: this.snapToGrid(actualWidth, GRID),
            worldHeight,
            spawn,
            victory,
            platforms,
            movingPlatforms: [],
            monsters,
            coins
        };
    }

    private snapToGrid(value: number, grid: number): number {
        return Math.round(value / grid) * grid;
    }
}
